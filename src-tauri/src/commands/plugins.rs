use crate::plugins::{Plugin, PluginManager};
use std::collections::HashMap;

#[tauri::command]
pub async fn add_plugin(plugin: Plugin) -> Result<(), String> {
    let manager = PluginManager::new().map_err(|e| e.to_string())?;
    let plugin = Plugin {
        enabled: true,
        ..plugin
    };
    manager.save_plugin(&plugin).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_plugin(name: String) -> Result<(), String> {
    let mut manager = PluginManager::new().map_err(|e| e.to_string())?;
    manager.remove_plugin(&name).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_plugin(name: String) -> Result<Option<Plugin>, String> {
    let manager = PluginManager::new().map_err(|e| e.to_string())?;
    Ok(manager.get_plugin(&name).cloned())
}

#[tauri::command]
pub async fn list_plugins() -> Result<Vec<Plugin>, String> {
    let manager = PluginManager::new().map_err(|e| e.to_string())?;
    Ok(manager.list_plugins().into_iter().cloned().collect())
}

#[tauri::command]
pub async fn update_plugin(old_name: String, plugin: Plugin) -> Result<(), String> {
    let mut manager = PluginManager::new().map_err(|e| e.to_string())?;
    manager
        .update_plugin(&old_name, plugin)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_plugin(
    name: String,
    args: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let mut manager = PluginManager::new().map_err(|e| e.to_string())?;
    manager
        .execute_plugin(&name, args.unwrap_or_default())
        .map_err(|e| e.to_string())
}
