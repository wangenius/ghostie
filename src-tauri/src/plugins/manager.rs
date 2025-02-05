use crate::config::utils;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
/// 插件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    /// 插件名称
    pub name: String,
    /// 插件描述
    pub description: String,
    /// 插件是否启用
    pub enabled: bool,
    /// 插件脚本内容
    pub script_content: String,
    /// 插件参数
    pub args: Vec<PluginArg>,
}

/// 插件参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginArg {
    /// 参数名称
    pub name: String,
    /// 参数类型
    pub arg_type: String,
    /// 参数描述
    pub description: String,
    /// 参数是否必填
    pub required: bool,
    /// 参数默认值
    pub default_value: Option<String>,
}

/// PowerShell 插件管理器
pub struct PluginManager {
    /// 插件目录
    plugins_dir: PathBuf,
    /// 已加载的插件
    plugins: HashMap<String, Plugin>,
}

impl PluginManager {
    pub fn new() -> Result<Self> {
        let app_dir = utils::get_config_dir().expect("Failed to get config directory");
        let plugins_dir = app_dir.join("plugins");

        // 确保插件目录存在
        if !plugins_dir.exists() {
            fs::create_dir_all(&plugins_dir)?;
        }

        let mut manager = Self {
            plugins: HashMap::new(),
            plugins_dir,
        };

        // 加载所有插件配置
        manager.load_all_plugins()?;

        Ok(manager)
    }

    fn load_all_plugins(&mut self) -> Result<()> {
        for entry in fs::read_dir(&self.plugins_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("yml") {
                if let Ok(plugin) = self.load_plugin_from_file(&path) {
                    self.plugins.insert(plugin.name.clone(), plugin);
                }
            }
        }
        Ok(())
    }

    fn load_plugin_from_file<P: AsRef<Path>>(&self, path: P) -> Result<Plugin> {
        let contents = fs::read_to_string(path)?;
        let plugin: Plugin = serde_yaml::from_str(&contents)?;
        Ok(plugin)
    }

    pub fn save_plugin(&self, plugin: &Plugin) -> Result<()> {
        let yaml = serde_yaml::to_string(plugin)?;
        let file_path = self.plugins_dir.join(format!("{}.yml", plugin.name));
        fs::write(file_path, yaml)?;
        Ok(())
    }

    pub fn execute_plugin(&mut self, name: &str, args: HashMap<String, String>) -> Result<String> {
        let plugin = self
            .plugins
            .get(name)
            .ok_or_else(|| anyhow!("plugin not found: {}", name))?;

        // 构建参数字符串，使用PowerShell函数调用语法
        let args_str = args
            .iter()
            .map(|(k, v)| format!("-{} '{}'", k, v.replace("'", "'''")))
            .collect::<Vec<_>>()
            .join(" ");

        // 构建完整的PowerShell命令
        let ps_command = format!(
            "{}; $output = main {}; $output",
            plugin.script_content, args_str
        );

        // 执行PowerShell脚本
        let mut cmd = Command::new("pwsh");

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let output = cmd
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &ps_command,
            ])
            .output()?;

        if !output.status.success() {
            return Err(anyhow!(
                "Plugin execution failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let result = String::from_utf8_lossy(&output.stdout)
            .to_string()
            .trim()
            .to_string();
        if result.is_empty() {
            Ok("No output".to_string())
        } else {
            Ok(result)
        }
    }

    pub fn get_plugin(&self, name: &str) -> Option<&Plugin> {
        self.plugins.get(name)
    }

    pub fn remove_plugin(&mut self, name: &str) -> Result<Option<Plugin>> {
        let file_path = self.plugins_dir.join(format!("{}.yml", name));
        if file_path.exists() {
            fs::remove_file(file_path)?;
        }

        Ok(self.plugins.remove(name))
    }

    pub fn list_plugins(&self) -> Vec<&Plugin> {
        self.plugins.values().collect()
    }

    pub fn update_plugin(&mut self, old_name: &str, plugin: Plugin) -> Result<()> {
        if !self.plugins.contains_key(old_name) {
            return Err(anyhow!("plugin not found: {}", old_name));
        }

        if old_name != plugin.name && self.plugins.contains_key(&plugin.name) {
            return Err(anyhow!("plugin already exists: {}", plugin.name));
        }

        // 如果名称改变了，删除旧的配置文件
        if old_name != plugin.name {
            let old_file_path = self.plugins_dir.join(format!("{}.yml", old_name));
            if old_file_path.exists() {
                fs::remove_file(old_file_path)?;
            }
            self.plugins.remove(old_name);
        }

        // 保存新的配置
        self.save_plugin(&plugin)?;
        self.plugins.insert(plugin.name.clone(), plugin);
        Ok(())
    }
}
