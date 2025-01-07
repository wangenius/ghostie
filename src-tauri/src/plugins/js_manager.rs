use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Result, anyhow};
use crate::llm::utils;
use super::types::JsPlugin;

/// JavaScript 插件管理器
pub struct JsPluginManager {
    /// 插件目录
    plugins_dir: PathBuf,
    /// 已加载的插件
    plugins: HashMap<String, JsPlugin>,
}

impl JsPluginManager {
    pub fn new() -> Result<Self> {
        let app_dir = utils::get_config_dir().expect("Failed to get config directory");
        let plugins_dir = app_dir.join("js_plugins");
        
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

    fn load_plugin_from_file<P: AsRef<Path>>(&self, path: P) -> Result<JsPlugin> {
        let contents = fs::read_to_string(path)?;
        let plugin: JsPlugin = serde_yaml::from_str(&contents)?;
        Ok(plugin)
    }

    pub fn save_plugin(&self, plugin: &JsPlugin) -> Result<()> {
        let yaml = serde_yaml::to_string(plugin)?;
        let file_path = self.plugins_dir.join(format!("{}.yml", plugin.name));
        fs::write(file_path, yaml)?;
        Ok(())
    }

    pub fn get_plugin(&self, name: &str) -> Option<&JsPlugin> {
        self.plugins.get(name)
    }

    pub fn remove_plugin(&mut self, name: &str) -> Result<Option<JsPlugin>> {
        let file_path = self.plugins_dir.join(format!("{}.yml", name));
        if file_path.exists() {
            fs::remove_file(file_path)?;
        }
        Ok(self.plugins.remove(name))
    }

    pub fn list_plugins(&self) -> Vec<&JsPlugin> {
        self.plugins.values().collect()
    }

    pub fn update_plugin(&mut self, old_name: &str, plugin: JsPlugin) -> Result<()> {
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