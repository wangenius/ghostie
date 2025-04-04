use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::plugins::deno::error::{PluginError, Result};
use base64::engine::{general_purpose::STANDARD, Engine};

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
    env_manager: crate::plugins::deno::env::EnvManager,
}

impl PluginManager {
    /// 创建新的插件管理器
    pub fn new() -> Result<Self> {
        let plugins_dir = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins");
        std::fs::create_dir_all(&plugins_dir)?;
        Ok(Self {
            env_manager: crate::plugins::deno::env::EnvManager::new()?,
        })
    }

    /// 执行插件工具
    pub async fn execute(&self, content: &str, tool: &str, args: Value) -> Result<Value> {
        let runtime = crate::plugins::deno::DENO_RUNTIME.lock().await;
        let runtime = runtime.as_ref().ok_or_else(|| PluginError::Plugin("Deno运行时未初始化".to_string()))?;

        if !runtime.check_installed() {
            return Err(PluginError::DenoNotInstalled);
        }

        // 使用 data URL 直接执行内容
        let script = format!(
            r#"
            (async () => {{
                const plugin = await import('data:text/typescript;base64,{content}');
                const targetFunction = plugin['{tool}'];
                if (typeof targetFunction !== 'function') {{
                    throw new Error(`插件中未找到函数 '{tool}' 或导出不是一个函数。`);
                }}
                // 从 Rust 传递过来的 JSON 字符串，需要解析
                const parsedArgs = JSON.parse('{args_json}'); 
                // 直接调用目标函数并传递解析后的参数对象
                // TypeScript 函数内部负责处理参数结构
                const result = await targetFunction(parsedArgs); 
                // 将结果序列化为 JSON 字符串并打印到 stdout, 以便 Rust 捕获
                console.log(JSON.stringify(result !== undefined ? result : null)); 
            }})();
            "#,
            content = STANDARD.encode(content),
            tool = tool,
            // 确保 args 被正确序列化为 JSON 字符串, 并进行 JS 字符串所需的基本转义
            args_json = serde_json::to_string(&args)?
                            .replace("\\", "\\\\") // 必须先转义反斜杠本身
                            .replace("'", "\\'")   // 转义单引号
                            .replace("\"", "\\\"")  // 转义双引号
                            .replace("\n", "\\n")   // 转义换行符
                            .replace("\r", "\\r")   // 转义回车符
        );

        println!("{}", script);

        let env_vars = self.env_manager.load().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        
        serde_json::from_str(&output).map_err(|e| PluginError::Json(e.to_string()))
    }


} 