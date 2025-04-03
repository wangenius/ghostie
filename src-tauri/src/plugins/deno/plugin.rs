use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::RwLock;
use once_cell::sync::Lazy;
use uuid::Uuid;
use crate::plugins::deno::error::{PluginError, Result};

/// 插件信息结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tools: Vec<Tool>,
}

/// 工具信息结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: Option<Value>,
}

/// 带内容的插件结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginWithContent {
    pub info: Plugin,
    pub content: String,
}

/// 插件管理器
pub struct PluginManager {
    plugins_dir: PathBuf,
    env_manager: crate::plugins::deno::env::EnvManager,
}

// 全局插件缓存
static PLUGIN_CACHE: Lazy<RwLock<HashMap<String, Plugin>>> = Lazy::new(|| RwLock::new(HashMap::new()));

impl PluginManager {
    /// 创建新的插件管理器
    pub fn new() -> Result<Self> {
        let plugins_dir = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins");
        fs::create_dir_all(&plugins_dir)?;
        
        Ok(Self {
            plugins_dir,
            env_manager: crate::plugins::deno::env::EnvManager::new()?,
        })
    }

    /// 导入插件
    pub async fn import(&self, content: String) -> Result<Plugin> {
        let id = Uuid::new_v4().to_string();
        self.process_plugin_content(id, content).await
    }

    /// 获取插件列表
    pub async fn list(&self) -> Result<HashMap<String, Plugin>> {
        let cache = PLUGIN_CACHE.read().await;
        if !cache.is_empty() {
            return Ok(cache.clone());
        }

        let list_file = self.plugins_dir.join("list.toml");
        if !list_file.exists() {
            return Ok(HashMap::new());
        }

        let content = fs::read_to_string(list_file)?;
        let plugins: HashMap<String, Plugin> = toml::from_str(&content)?;
        
        let mut cache = PLUGIN_CACHE.write().await;
        *cache = plugins.clone();
        
        Ok(plugins)
    }

    /// 获取插件
    pub async fn get(&self, id: &str) -> Result<Option<PluginWithContent>> {
        let plugins = self.list().await?;
        
        if let Some(plugin) = plugins.get(id) {
            let plugin_file = self.plugins_dir.join(format!("{}.ts", id));
            let content = fs::read_to_string(plugin_file)?;
            
            Ok(Some(PluginWithContent {
                info: plugin.clone(),
                content,
            }))
        } else {
            Ok(None)
        }
    }

    /// 删除插件
    pub async fn remove(&self, id: &str) -> Result<()> {
        let mut plugins = self.list().await?;
        plugins.remove(id);
        
        self.save_plugin_list(&plugins).await?;

        let plugin_file = self.plugins_dir.join(format!("{}.ts", id));
        if plugin_file.exists() {
            fs::remove_file(plugin_file)?;
        }

        let mut cache = PLUGIN_CACHE.write().await;
        *cache = plugins;

        Ok(())
    }

    /// 更新插件
    pub async fn update(&self, id: &str, content: String) -> Result<Plugin> {
        let plugins = self.list().await?;
        if !plugins.contains_key(id) {
            return Err(PluginError::NotFound(id.to_string()));
        }
        
        self.process_plugin_content(id.to_string(), content).await
    }

    /// 执行插件工具
    pub async fn execute(&self, id: &str, tool: &str, args: Value) -> Result<Value> {
        let plugin_file = self.plugins_dir.join(format!("{}.ts", id));
        if !plugin_file.exists() {
            return Err(PluginError::NotFound(id.to_string()));
        }

        let runtime = crate::plugins::deno::DENO_RUNTIME.lock().await;
        let runtime = runtime.as_ref().ok_or_else(|| PluginError::Plugin("Deno运行时未初始化".to_string()))?;

        if !runtime.check_installed() {
            return Err(PluginError::DenoNotInstalled);
        }

        let script = format!(
            r#"
            const plugin = await import('file://{plugin_path}');
            const targetFunction = plugin.default.tools['{tool}'];
            if (!targetFunction) {{
                throw new Error('未知函数: {tool}');
            }}
            const result = await targetFunction.handler({args});
            console.log(JSON.stringify(result));
            "#,
            plugin_path = plugin_file.to_string_lossy().replace('\\', "/"),
            tool = tool,
            args = serde_json::to_string(&args)?
        );

        let env_vars = self.env_manager.load().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        
        serde_json::from_str(&output).map_err(|e| PluginError::Json(e.to_string()))
    }

    /// 处理插件内容
    async fn process_plugin_content(&self, id: String, content: String) -> Result<Plugin> {
        let plugin_file = self.plugins_dir.join(format!("{}.ts", id));
        fs::write(&plugin_file, &content)?;

        let script = format!(
            r#"
            const plugin = await import('file://{plugin_path}');
            const tools = Object.entries(plugin.default.tools || {{}})
                .map(([key, value]) => {{
                    const res = {{
                        name: key || "undefined",
                        description: value.description || "",
                    }};
                    if (value.parameters) {{
                       res.parameters = value.parameters;
                    }}
                    return res;
                }});
            console.log(JSON.stringify({{
                name: plugin.default.name || "undefined",
                description: plugin.default.description || "",
                tools
            }}));
            "#,
            plugin_path = plugin_file.to_string_lossy().replace('\\', "/")
        );

        let runtime = crate::plugins::deno::DENO_RUNTIME.lock().await;
        let runtime = runtime.as_ref().ok_or_else(|| PluginError::Plugin("Deno运行时未初始化".to_string()))?;

        let env_vars = self.env_manager.load().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        let plugin_info: Value = serde_json::from_str(&output)?;

        let tools = plugin_info["tools"]
            .as_array()
            .ok_or_else(|| PluginError::Plugin("tools 字段无效".to_string()))?
            .iter()
            .map(|tool| {
                let name = tool["name"]
                    .as_str()
                    .ok_or_else(|| PluginError::Plugin("tool name 字段无效".to_string()))?
                    .to_string();
                let description = tool["description"]
                    .as_str()
                    .ok_or_else(|| PluginError::Plugin("tool description 字段无效".to_string()))?
                    .to_string();
                Ok(Tool {
                    name,
                    description,
                    parameters: if tool.get("parameters").is_some() {
                        Some(tool["parameters"].clone())
                    } else {
                        None
                    },
                })
            })
            .collect::<Result<Vec<_>>>()?;

        let plugin = Plugin {
            id: id.clone(),
            name: plugin_info["name"]
                .as_str()
                .ok_or_else(|| PluginError::Plugin("name 字段无效".to_string()))?
                .to_string(),
            description: plugin_info["description"].as_str().map(|s| s.to_string()),
            tools,
        };

        let mut plugins = self.list().await?;
        plugins.insert(id, plugin.clone());
        self.save_plugin_list(&plugins).await?;

        let mut cache = PLUGIN_CACHE.write().await;
        *cache = plugins;

        Ok(plugin)
    }

    /// 保存插件列表
    async fn save_plugin_list(&self, plugins: &HashMap<String, Plugin>) -> Result<()> {
        let content = toml::to_string(plugins)?;
        fs::write(self.plugins_dir.join("list.toml"), content)?;
        Ok(())
    }
} 