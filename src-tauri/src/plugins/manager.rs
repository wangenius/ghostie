use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use anyhow::{Result, anyhow};
use tokio::fs;
use semver::{Version, VersionReq};

use super::types::{Plugin, PluginConfig, PluginMetadata, PluginDependency};
use super::loader::PluginLoader;
use crate::llm::utils;

/// 插件管理器
pub struct PluginManager {
    /// 插件目录
    plugins_dir: PathBuf,
    /// 已加载的插件
    plugins: RwLock<HashMap<String, Arc<Box<dyn Plugin>>>>,
    /// 插件配置
    configs: RwLock<HashMap<String, PluginConfig>>,
    /// 已加载的动态库
    libraries: RwLock<HashMap<String, Arc<libloading::Library>>>,
}

impl PluginManager {
    pub fn new() -> Result<Self> {
        let app_dir = utils::get_config_dir().expect("Failed to get config directory");
        let plugins_dir = app_dir.join("plugins");

        // 确保插件目录存在
        if !plugins_dir.exists() {
            std::fs::create_dir_all(&plugins_dir)?;
        }

        Ok(Self {
            plugins_dir,
            plugins: RwLock::new(HashMap::new()),
            configs: RwLock::new(HashMap::new()),
            libraries: RwLock::new(HashMap::new()),
        })
    }

    /// 检查插件依赖
    fn check_dependencies(&self, config: &PluginConfig) -> Result<()> {
        let configs = self.configs.read().map_err(|_| anyhow!("获取配置锁失败"))?;
        
        for dep in &config.metadata.dependencies {
            if let Some(dep_config) = configs.get(&dep.id) {
                let version = Version::parse(&dep_config.metadata.version)?;
                let req = VersionReq::parse(&dep.version_req)?;
                
                if !req.matches(&version) {
                    if !dep.optional {
                        return Err(anyhow!(
                            "插件 {} 依赖 {} 版本 {}，但找到的版本是 {}",
                            config.metadata.id,
                            dep.id,
                            dep.version_req,
                            version
                        ));
                    }
                }
            } else if !dep.optional {
                return Err(anyhow!(
                    "插件 {} 依赖 {}，但未找到该插件",
                    config.metadata.id,
                    dep.id
                ));
            }
        }
        
        Ok(())
    }

    /// 获取插件加载顺序
    fn get_load_order(&self, configs: &HashMap<String, PluginConfig>) -> Result<Vec<String>> {
        let mut order = Vec::new();
        let mut visited = HashSet::new();
        let mut visiting = HashSet::new();
        
        for config in configs.values() {
            self.visit_plugin(&config.metadata.id, configs, &mut visited, &mut visiting, &mut order)?;
        }
        
        Ok(order)
    }

    fn visit_plugin(
        &self,
        id: &str,
        configs: &HashMap<String, PluginConfig>,
        visited: &mut HashSet<String>,
        visiting: &mut HashSet<String>,
        order: &mut Vec<String>,
    ) -> Result<()> {
        if visited.contains(id) {
            return Ok(());
        }
        
        if visiting.contains(id) {
            return Err(anyhow!("检测到循环依赖: {}", id));
        }
        
        visiting.insert(id.to_string());
        
        if let Some(config) = configs.get(id) {
            for dep in &config.metadata.dependencies {
                if !dep.optional {
                    self.visit_plugin(&dep.id, configs, visited, visiting, order)?;
                }
            }
        }
        
        visiting.remove(id);
        visited.insert(id.to_string());
        order.push(id.to_string());
        
        Ok(())
    }

    /// 加载插件
    pub async fn load_plugin(&self, config: &PluginConfig) -> Result<()> {
        // 检查依赖
        self.check_dependencies(config)?;
        
        // 构建插件库路径
        let lib_path = self.plugins_dir
            .join("libs")
            .join(&config.metadata.library);
            
        // 加载动态库
        let library = unsafe { libloading::Library::new(&lib_path) }
            .map_err(|e| anyhow!("加载插件库失败: {}", e))?;
            
        // 保存库引用
        let library = Arc::new(library);
        self.libraries.write()
            .map_err(|_| anyhow!("获取库锁失败"))?
            .insert(config.metadata.id.clone(), library.clone());
            
        // 加载插件
        let plugin = unsafe { PluginLoader::load_plugin_from_lib(library)? };
        
        // 注册插件
        self.register_plugin(plugin)?;
        
        Ok(())
    }

    /// 加载所有插件
    pub async fn load_all_plugins(&self) -> Result<()> {
        // 加载配置
        self.load_plugin_configs().await?;
        
        // 获取配置
        let configs = self.configs.read()
            .map_err(|_| anyhow!("获取配置锁失败"))?
            .clone();
            
        // 获取加载顺序
        let load_order = self.get_load_order(&configs)?;
        
        // 按顺序加载插件
        for id in load_order {
            if let Some(config) = configs.get(&id) {
                if config.enabled {
                    self.load_plugin(config).await?;
                }
            }
        }
        
        Ok(())
    }

    /// 卸载插件
    pub async fn unregister_plugin(&self, id: &str) -> Result<()> {
        // 移除插件实例
        let mut plugins = self.plugins.write().map_err(|_| anyhow!("获取插件锁失败"))?;
        if let Some(plugin) = plugins.remove(id) {
            if Arc::strong_count(&plugin) == 1 {
                let mut plugin = Arc::try_unwrap(plugin)
                    .map_err(|_| anyhow!("插件仍在使用中"))?;
                plugin.uninstall()?;
            }
        }
        
        // 移除动态库
        let mut libraries = self.libraries.write().map_err(|_| anyhow!("获取库锁失败"))?;
        libraries.remove(id);
        
        Ok(())
    }

    /// 加载插件配置
    pub async fn load_plugin_configs(&self) -> Result<()> {
        let config_dir = self.plugins_dir.join("configs");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).await?;
            return Ok(());
        }

        let mut configs = self.configs.write().map_err(|_| anyhow!("获取配置锁失败"))?;
        
        let mut entries = fs::read_dir(&config_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("yml") {
                if let Ok(config) = self.load_plugin_config(&path).await {
                    configs.insert(config.metadata.id.clone(), config);
                }
            }
        }
        
        Ok(())
    }

    /// 从文件加载插件配置
    async fn load_plugin_config<P: AsRef<Path>>(&self, path: P) -> Result<PluginConfig> {
        let contents = fs::read_to_string(path).await?;
        let config: PluginConfig = serde_yaml::from_str(&contents)?;
        Ok(config)
    }

    /// 保存插件配置
    pub async fn save_plugin_config(&self, config: &PluginConfig) -> Result<()> {
        let config_dir = self.plugins_dir.join("configs");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).await?;
        }

        let yaml = serde_yaml::to_string(config)?;
        let file_path = config_dir.join(format!("{}.yml", config.metadata.id));
        fs::write(file_path, yaml).await?;
        
        let mut configs = self.configs.write().map_err(|_| anyhow!("获取配置锁失败"))?;
        configs.insert(config.metadata.id.clone(), config.clone());
        
        Ok(())
    }

    /// 获取插件配置
    pub fn get_plugin_config(&self, id: &str) -> Option<PluginConfig> {
        self.configs.read().ok()?.get(id).cloned()
    }

    /// 注册插件
    pub fn register_plugin(&self, plugin: Box<dyn Plugin>) -> Result<()> {
        let metadata = plugin.metadata();
        let id = metadata.id.clone();
        
        let mut plugins = self.plugins.write().map_err(|_| anyhow!("获取插件锁失败"))?;
        plugins.insert(id, Arc::new(plugin));
        
        Ok(())
    }

    /// 获取插件实例
    pub fn get_plugin(&self, id: &str) -> Option<Arc<Box<dyn Plugin>>> {
        self.plugins.read().ok()?.get(id).cloned()
    }

    /// 获取所有插件
    pub fn list_plugins(&self) -> Vec<Arc<Box<dyn Plugin>>> {
        self.plugins.read()
            .map(|plugins| plugins.values().cloned().collect())
            .unwrap_or_default()
    }

    /// 启用插件
    pub async fn enable_plugin(&self, id: &str) -> Result<()> {
        let mut configs = self.configs.write().map_err(|_| anyhow!("获取配置锁失败"))?;
        
        if let Some(config) = configs.get_mut(id) {
            if !config.enabled {
                if let Some(plugin) = self.get_plugin(id) {
                    // 克隆Arc以在临时作用域中使用
                    let plugin_clone = plugin.clone();
                    // 获取可变引用
                    let mut_plugin = Arc::get_mut(&mut *plugin_clone.clone())
                        .ok_or_else(|| anyhow!("无法获取插件的可变引用"))?;
                    mut_plugin.enable()?;
                    config.enabled = true;
                    self.save_plugin_config(config).await?;
                }
            }
        }
        
        Ok(())
    }

    /// 禁用插件
    pub async fn disable_plugin(&self, id: &str) -> Result<()> {
        let mut configs = self.configs.write().map_err(|_| anyhow!("获取配置锁失败"))?;
        
        if let Some(config) = configs.get_mut(id) {
            if config.enabled {
                if let Some(plugin) = self.get_plugin(id) {
                    let plugin_clone = plugin.clone();
                    let mut_plugin = Arc::get_mut(&mut *plugin_clone.clone())
                        .ok_or_else(|| anyhow!("无法获取插件的可变引用"))?;
                    mut_plugin.disable()?;
                    config.enabled = false;
                    self.save_plugin_config(config).await?;
                }
            }
        }
        
        Ok(())
    }
} 