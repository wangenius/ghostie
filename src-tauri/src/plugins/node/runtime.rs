use std::fs;
use std::process::Command;
use std::time::Duration;
use tokio::time;

use crate::plugins::node::env::EnvVar;
use crate::plugins::node::error::{PluginError, Result};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Node运行时配置
pub struct NodeRuntime {
    /// 是否已安装
    is_installed: bool,
    /// 超时时间
    timeout: Duration,
}

impl NodeRuntime {
    /// 创建新的Node运行时实例
    pub fn new() -> std::io::Result<Self> {
        let mut cmd = Command::new("cmd");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        let is_installed = cmd.arg("node -v").output().is_ok();

        if !is_installed {
            return Ok(Self {
                is_installed: false,
                timeout: Duration::from_secs(30),
            });
        }

        // 检查并初始化plugins目录
        if let Some(config_dir) = crate::utils::file::get_config_dir() {
            let plugins_dir = config_dir.join("plugins");

            // 确保plugins目录存在
            if !plugins_dir.exists() {
                fs::create_dir_all(&plugins_dir)?;
            }

            // 检查package.json是否存在
            let package_json_path = plugins_dir.join("package.json");
            println!("package_json_path: {}", package_json_path.display());
            println!("package_json_path exists? {}", package_json_path.exists());

            // 尝试直接读取文件看看是否能成功
            match std::fs::read(&package_json_path) {
                Ok(content) => println!("文件能够读取，大小: {} 字节", content.len()),
                Err(e) => println!("文件读取失败: {}", e),
            }

            // 强制刷新检查文件是否存在
            let exists = std::fs::metadata(&package_json_path).is_ok();
            println!("通过 metadata 检查文件是否存在: {}", exists);

            if !exists {
                println!("需要初始化 package.json");

                // 在plugins目录中初始化package.json
                let mut init_cmd = Command::new("cmd");
                #[cfg(windows)]
                init_cmd.creation_flags(0x08000000);

                let init_result = init_cmd
                    .current_dir(&plugins_dir)
                    .args(["/c", "npm", "init", "-y"])
                    .output();

                if let Err(e) = &init_result {
                    println!("npm init 命令执行失败: {}", e);
                    // 如果命令执行失败，手动创建 package.json
                    println!("手动创建基础 package.json 文件");
                    let basic_package = r#"{
  "name": "ghostie-plugins",
  "version": "1.0.0",
  "description": "Ghostie plugins directory",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}"#;
                    if let Err(write_err) = fs::write(&package_json_path, basic_package) {
                        println!("手动创建 package.json 失败: {}", write_err);
                        return Err(write_err.into());
                    }
                } else if !package_json_path.exists() {
                    // 命令执行成功但文件仍不存在，手动创建
                    println!("npm init 成功但 package.json 仍不存在，手动创建");
                    let basic_package = r#"{
  "name": "ghostie-plugins",
  "version": "1.0.0",
  "description": "Ghostie plugins directory",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}"#;
                    if let Err(write_err) = fs::write(&package_json_path, basic_package) {
                        println!("手动创建 package.json 失败: {}", write_err);
                        return Err(write_err.into());
                    }
                }

                // 不再需要安装typescript和ts-node依赖，因为我们在前端编译TypeScript
                // npm init 成功，无需安装额外依赖，继续执行
            }
        }

        Ok(Self {
            is_installed: true,
            timeout: Duration::from_secs(30),
        })
    }
    /// 设置超时时间
    pub fn set_timeout(&mut self, timeout: Duration) {
        self.timeout = timeout;
    }

    /// 执行Node脚本
    pub async fn execute(&self, script: &str, env_vars: &[EnvVar]) -> Result<String> {
        if !self.is_installed {
            return Err(PluginError::NodeNotInstalled);
        }

        // 使用.js扩展名，因为现在我们直接执行JavaScript
        let temp_filename = format!("temp_{}.js", uuid::Uuid::new_v4());
        let temp_file = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins")
            .join(&temp_filename);
        std::fs::write(&temp_file, script)?;
        let mut cmd = Command::new("cmd");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        // 设置命令编码为 UTF-8
        #[cfg(windows)]
        cmd.arg("/c").arg("chcp 65001>nul &&");

        // 直接使用node执行JavaScript文件，不需要ts-node
        println!("node {}", temp_file.display());
        cmd.arg("node").arg(&temp_file);

        for var in env_vars {
            cmd.env(&var.key, &var.value);
        }

        let output = time::timeout(self.timeout, async { cmd.output() })
            .await
            .map_err(|_| PluginError::Timeout)??;

        // 清理临时文件
        let _ = std::fs::remove_file(&temp_file);

        if output.status.success() {
            println!("{}", String::from_utf8_lossy(&output.stdout).to_string());
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            println!("{}", String::from_utf8_lossy(&output.stderr).to_string());
            Err(PluginError::Plugin(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    /// 检查Node是否已安装
    pub fn check_installed(&self) -> bool {
        let mut cmd = Command::new("cmd");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        let is_installed = cmd.arg("node -v").output().is_ok();

        if !is_installed {
            return false;
        }
        true
    }

    /// 获取 Node 版本和路径信息
    pub fn get_version_and_path(&self) -> Option<(String, String)> {
        if !self.is_installed {
            return None;
        }

        let mut cmd = Command::new("cmd");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        match cmd.arg("node -v").output() {
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
                    Some((version, "cmd".to_string()))
                } else {
                    None
                }
            }
            Err(_) => None,
        }
    }
}
