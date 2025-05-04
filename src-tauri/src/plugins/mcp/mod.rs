pub mod mcp;
use crate::plugins::mcp::mcp::MCPManager;
use anyhow::Result;
use once_cell::sync::Lazy;
use rmcp::model::{CallToolResult, Tool};
use std::collections::HashMap;
use tokio::sync::Mutex;

static MCP_MANAGER: Lazy<Mutex<Option<MCPManager>>> = Lazy::new(|| Mutex::new(None));
/// 初始化管理器
pub async fn init() -> Result<()> {
    let mut plugin_manager = MCP_MANAGER.lock().await;
    if plugin_manager.is_none() {
        *plugin_manager = Some(MCPManager::new()?);
    }
    Ok(())
}

#[tauri::command]
pub async fn start_service(id: String, env: Option<HashMap<String, String>>) -> Result<(), String> {
    let state = MCP_MANAGER.lock().await;
    if let Some(manager) = state.as_ref() {
        manager
            .start_service(&id, env)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("MCP管理器未初始化".to_string())
    }
}

#[tauri::command]
pub async fn stop_service(id: String) -> Result<(), String> {
    let state = MCP_MANAGER.lock().await;
    if let Some(manager) = state.as_ref() {
        manager.stop_service(&id).await.map_err(|e| e.to_string())
    } else {
        Err("MCP管理器未初始化".to_string())
    }
}

#[tauri::command]
pub async fn get_service_info(id: String) -> Result<(String, Vec<Tool>), String> {
    let state = MCP_MANAGER.lock().await;
    if let Some(manager) = state.as_ref() {
        manager
            .get_service_info(&id)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("MCP管理器未初始化".to_string())
    }
}

#[tauri::command]
pub async fn call_tool(
    id: String,
    name: String,
    args: serde_json::Value,
) -> Result<CallToolResult, String> {
    let state = MCP_MANAGER.lock().await;
    if let Some(manager) = state.as_ref() {
        // 将args转换为Map
        let arguments = match args {
            serde_json::Value::Object(map) => map,
            _ => return Err("参数必须是有效的JSON对象".to_string()),
        };

        manager
            .call_tool(&id, &name, arguments)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("MCP管理器未初始化".to_string())
    }
}
