use crate::model::manager::{ModelConfig, ModelManager};
use std::collections::HashMap;

#[tauri::command]
pub async fn add_model(name: String, model: ModelConfig) -> Result<(), String> {
    ModelManager::add(name, model).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_model(name: String) -> Result<(), String> {
    ModelManager::remove(name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models() -> Result<ModelManager, String> {
    let models = ModelManager::list_models().map_err(|e| e.to_string())?;
    Ok(models)
}

#[tauri::command]
pub async fn set_current_model(name: String) -> Result<(), String> {
    ModelManager::set_current(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_model(
    name: String,
    new_name: String,
    model: ModelConfig,
) -> Result<(), String> {
    ModelManager::update_model(name, new_name, model).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_model(name: String) -> Result<HashMap<String, String>, String> {
    let manager = ModelManager::list_models().map_err(|e| e.to_string())?;
    let model_config = manager
        .models
        .get(&name)
        .ok_or_else(|| format!("Model not found: {}", name))?;

    let mut result = HashMap::new();
    result.insert("name".to_string(), name);
    result.insert("api_key".to_string(), model_config.api_key.clone());
    result.insert("api_url".to_string(), model_config.api_url.clone());
    result.insert("model".to_string(), model_config.model.clone());

    Ok(result)
}
