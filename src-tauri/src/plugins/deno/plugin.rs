use crate::plugins::deno::error::{PluginError, Result};
use crate::utils::gen::generate_id;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{create_dir_all, write};

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
        let runtime = crate::plugins::deno::DENO_RUNTIME.lock().await;
        let runtime = runtime
            .as_ref()
            .ok_or_else(|| PluginError::Plugin("Deno运行时未初始化".to_string()))?;

        if !runtime.check_installed() {
            return Err(PluginError::DenoNotInstalled);
        }

        // 获取插件目录
        let config_dir = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?;
        let plugins_dir = config_dir.join("plugins");
        create_dir_all(&plugins_dir)?;

        // 创建唯一的插件文件
        let plugin_path = plugins_dir.join(format!("plugin_{}.ts", generate_id()));
        let plugin_path_str = plugin_path.to_str().unwrap();

        // 写入插件内容
        write(&plugin_path, content)?;

        // 使用文件路径方式执行
        let script = format!(
            r#"
            (async () => {{
                try {{
                    const plugin = await import('file://{plugin_path}');
                    const targetFunction = plugin['{tool}'];
                    if (typeof targetFunction !== 'function') {{
                        throw new Error(`插件中未找到函数 '{tool}' 或导出不是一个函数。`);
                    }}
                    const parsedArgs = JSON.parse('{args_json}');
                    const result = await targetFunction(parsedArgs);
                    // 输出成功结果
                    console.log(JSON.stringify({{ result: result !== undefined ? result : null }}));
                }} catch (e) {{
                    // 输出错误结果
                    console.log(JSON.stringify({{ error: e instanceof Error ? e.message : String(e) }}));
                }}
            }})();
            "#,
            plugin_path = plugin_path_str.replace("\\", "/"), // 确保路径使用正斜杠
            tool = tool,
            args_json = serde_json::to_string(&args)?
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
        );

        let env_vars = crate::plugins::deno::env_list().await?;
        let output = runtime.execute(&script, &env_vars).await?;
        // 清理插件文件
        let _ = std::fs::remove_file(&plugin_path);
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
