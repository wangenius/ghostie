use crate::plugins::node::error::{PluginError, Result};
use serde_json::Value;

/// 插件管理器
pub struct PluginManager {}

impl PluginManager {
    /// 创建新的插件管理器
    pub fn new() -> Result<Self> {
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
            {content}
            (async () => {{
                try {{
                    if (typeof {tool} !== 'function') {{
                        throw new Error(`can't find function '{tool}' or it's not a function`);
                    }}
                    const args = {args_json};
                    const result = await {tool}(args);
                    console.log(JSON.stringify({{ result: result !== undefined ? result : null }}));
                }} catch (error) {{
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
        let env_vars = crate::plugins::node::env_list().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        // 尝试将输出解析为 JSON 值
        match serde_json::from_str::<Value>(&output) {
            Ok(json_value) => Ok(json_value),
            // JSON 解析失败时返回原始字符串
            Err(_) => Ok(Value::String(output)),
        }
    }
}
