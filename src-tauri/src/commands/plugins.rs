use crate::{JsPlugin, JsPluginManager};

#[tauri::command]
pub async fn add_js_plugin(name: String, script_content: String) -> Result<(), String> {
    let manager = JsPluginManager::new().map_err(|e| e.to_string())?;
    let plugin = JsPlugin {
        name,
        description: None,
        script_content,
        enabled: true,
    };
    manager.save_plugin(&plugin).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_js_plugin(name: String) -> Result<(), String> {
    let mut manager = JsPluginManager::new().map_err(|e| e.to_string())?;
    manager.remove_plugin(&name).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_js_plugin(name: String) -> Result<Option<JsPlugin>, String> {
    let manager = JsPluginManager::new().map_err(|e| e.to_string())?;
    Ok(manager.get_plugin(&name).cloned())
}

#[tauri::command]
pub async fn list_js_plugins() -> Result<Vec<JsPlugin>, String> {
    let manager = JsPluginManager::new().map_err(|e| e.to_string())?;
    Ok(manager.list_plugins().into_iter().cloned().collect())
}

#[tauri::command]
pub async fn update_js_plugin(old_name: String, plugin: JsPlugin) -> Result<(), String> {
    let mut manager = JsPluginManager::new().map_err(|e| e.to_string())?;
    manager
        .update_plugin(&old_name, plugin)
        .map_err(|e| e.to_string())
} 