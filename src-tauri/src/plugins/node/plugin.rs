use crate::plugins::node::error::{PluginError, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::write;

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
pub struct PluginManager {}

impl PluginManager {
    /// 创建新的插件管理器
    pub fn new() -> Result<Self> {
        let plugins_dir = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins");
        std::fs::create_dir_all(&plugins_dir)?;

        // 检查并创建 deno.json
        let deno_json_path = plugins_dir.join("deno.json");
        if !deno_json_path.exists() {
            let deno_json_content = r#"{
  "nodeModulesDir": "auto"
}"#;
            write(&deno_json_path, deno_json_content)?;
        }

        Ok(Self {})
    }

    /// 执行插件工具
    pub async fn execute(&self, content: &str, tool: &str, args: Value) -> Result<Value> {
        let runtime = crate::plugins::node::NODE_RUNTIME.lock().await;
        let runtime = runtime
            .as_ref()
            .ok_or_else(|| PluginError::Plugin("Node运行时未初始化".to_string()))?;

        if !runtime.check_installed() {
            return Err(PluginError::NodeNotInstalled);
        }

        // 构造执行脚本
        let script = format!(
            r#"
            // 插件内容
            {content}

            // 执行函数
            (async () => {{
                try {{
                    // 检查工具函数是否存在
                    if (typeof {tool} !== 'function') {{
                        throw new Error(`找不到函数 '{tool}' 或者它不是一个函数`);
                    }}
                    
                    // 解析参数
                    const args = {args_json};
                    const result = await {tool}(args);
                    
                    // 输出结果
                    console.log(JSON.stringify({{ result: result !== undefined ? result : null }}));
                }} catch (error) {{
                    console.error('执行错误:', error);
                    console.log(JSON.stringify({{ 
                        error: error instanceof Error ? error.message : String(error) 
                    }}));
                }}
            }})();
            "#,
            content = content,
            tool = tool,
            args_json = serde_json::to_string(&args)?
        );

        println!("{}", script);

        let env_vars = crate::plugins::node::env_list().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        println!("{}", output);

        // 尝试将输出解析为 JSON 值
        match serde_json::from_str::<Value>(&output) {
            Ok(json_value) => Ok(json_value),
            // JSON 解析完全失败
            Err(e) => {
                // 如果脚本内部逻辑完全失败并未能输出 JSON，则可能在此处失败
                Err(PluginError::Json(format!(
                    "Failed to parse JSON output from plugin ({}): {}",
                    e, output
                )))
            }
        }
    }
}
