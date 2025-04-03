use std::process::Command;
use std::time::Duration;
use tokio::time;

use crate::plugins::deno::error::{PluginError, Result};
use crate::plugins::deno::env::EnvVar;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Deno运行时配置
pub struct DenoRuntime {
    is_installed: bool,
    base_args: Vec<String>,
    deno_path: String,
    timeout: Duration,
}

impl DenoRuntime {
    /// 创建新的Deno运行时实例
    pub fn new() -> std::io::Result<Self> {
        let mut cmd = Command::new("deno");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        
        let is_installed = cmd.arg("--version").output().is_ok();

        if is_installed {
            return Ok(Self {
                is_installed: true,
                base_args: Self::get_base_args(),
                deno_path: "deno".to_string(),
                timeout: Duration::from_secs(30),
            });
        }

        // 尝试在系统路径中查找deno
        let path_var = std::env::var("PATH").unwrap_or_default();
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();

        let mut deno_paths = vec![
            String::from("deno.exe"),
            String::from(r"C:\Program Files\deno\deno.exe"),
            String::from(r"C:\ProgramData\chocolatey\bin\deno.exe"),
            format!("{}/.deno/bin/deno.exe", user_profile),
        ];

        for path in path_var.split(';') {
            let deno_path = format!("{}/deno.exe", path.trim());
            deno_paths.push(deno_path);
        }

        let mut found_path = String::from("deno");
        let is_found = deno_paths.iter().any(|path| {
            let mut cmd = Command::new(path);
            #[cfg(windows)]
            cmd.creation_flags(0x08000000);
            let result = cmd.arg("--version").output().is_ok();
            if result {
                found_path = path.clone();
            }
            result
        });

        Ok(Self {
            is_installed: is_found,
            base_args: Self::get_base_args(),
            deno_path: found_path,
            timeout: Duration::from_secs(30),
        })
    }

    /// 获取基础参数
    fn get_base_args() -> Vec<String> {
        vec![
            "run".to_string(),
            "--no-check".to_string(),
            "--allow-read".to_string(),
            "--allow-write".to_string(),
            "--allow-net".to_string(),
            "--allow-env".to_string(),
            "--allow-run".to_string(),
        ]
    }

    /// 设置超时时间
    pub fn set_timeout(&mut self, timeout: Duration) {
        self.timeout = timeout;
    }

    /// 执行Deno脚本
    pub async fn execute(&self, script: &str, env_vars: &[EnvVar]) -> Result<String> {
        if !self.is_installed {
            return Err(PluginError::DenoNotInstalled);
        }

        let temp_filename = format!("temp_{}.ts", uuid::Uuid::new_v4());
        let temp_file = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins")
            .join(&temp_filename);
        std::fs::write(&temp_file, script)?;

        let mut cmd = Command::new(&self.deno_path);
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        cmd.args(&self.base_args).arg(&temp_file);

        for var in env_vars {
            cmd.env(&var.key, &var.value);
        }

        let output = time::timeout(self.timeout, async {
            cmd.output()
        })
        .await
        .map_err(|_| PluginError::Timeout)??;

        // 清理临时文件
        let _ = std::fs::remove_file(&temp_file);

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(PluginError::Plugin(String::from_utf8_lossy(&output.stderr).to_string()))
        }
    }

    /// 检查Deno是否已安装
    pub fn check_installed(&self) -> bool {
        self.is_installed
    }

    /// 获取 Deno 版本和路径信息
    pub fn get_version_and_path(&self) -> Option<(String, String)> {
        if !self.is_installed {
            return None;
        }

        let mut cmd = Command::new(&self.deno_path);
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        match cmd.arg("--version").output() {
            Ok(output) => {
                if output.status.success() {
                    let version_output = String::from_utf8_lossy(&output.stdout);
                    let version = version_output
                        .lines()
                        .next()
                        .unwrap_or("")
                        .split_whitespace()
                        .nth(1)
                        .unwrap_or("unknown")
                        .to_string();
                    Some((version, self.deno_path.clone()))
                } else {
                    None
                }
            }
            Err(_) => None,
        }
    }
} 