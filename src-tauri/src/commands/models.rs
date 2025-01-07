use std::collections::HashMap;
use crate::llm::config::Config;

#[tauri::command]
pub async fn add_model(
    name: String,
    api_key: String,
    api_url: String,
    model: String,
) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config
        .add_model(name, api_key, api_url, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_model(name: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.remove_model(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<HashMap<String, String>>, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    let mut models = Vec::new();
    for (name, model_config) in &config.models {
        let is_current = config
            .current_model
            .as_ref()
            .map_or(false, |current| current == name);

        let mut model_info = HashMap::new();
        model_info.insert("name".to_string(), name.clone());
        model_info.insert("is_current".to_string(), is_current.to_string());
        model_info.insert("api_url".to_string(), model_config.api_url.clone());
        model_info.insert("model".to_string(), model_config.model.clone());

        models.push(model_info);
    }
    Ok(models)
}

#[tauri::command]
pub async fn set_current_model(name: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.set_current_model(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_model(
    old_name: String,
    name: String,
    api_key: Option<String>,
    api_url: String,
    model: String,
) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config
        .update_model(&old_name, name, api_key, api_url, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_model(name: String) -> Result<HashMap<String, String>, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    let model_config = config
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