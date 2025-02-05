use crate::bots::bot::{Bot, BotsConfig};
use std::collections::HashMap;

#[tauri::command]
pub async fn add_bot(name: String, system_prompt: String) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config
        .add_bot(name, system_prompt)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_bot(name: String) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config.remove_bot(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_bots() -> Result<Vec<serde_json::Value>, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    let mut bots = Vec::new();

    for (name, bot) in &config.bots {
        let mut bot_info = serde_json::Map::new();
        bot_info.insert("name".to_string(), serde_json::Value::String(name.clone()));
        bot_info.insert(
            "system_prompt".to_string(),
            serde_json::Value::String(bot.system_prompt.clone()),
        );
        bots.push(serde_json::Value::Object(bot_info));
    }

    Ok(bots)
}

#[tauri::command]
pub async fn set_current_bot(name: String) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config.set_current(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_current_bot() -> Result<Option<Bot>, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    Ok(config.get_current().cloned())
}

#[tauri::command]
pub async fn update_bot(
    old_name: String,
    name: String,
    system_prompt: String,
) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config
        .update_bot(&old_name, name, system_prompt)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bot(name: String) -> Result<HashMap<String, String>, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    let bot = config
        .bots
        .get(&name)
        .ok_or_else(|| format!("Bot not found: {}", name))?;

    let mut bot_info = HashMap::new();
    bot_info.insert("name".to_string(), name);
    bot_info.insert("bot_name".to_string(), bot.name.clone());
    bot_info.insert("system_prompt".to_string(), bot.system_prompt.clone());

    Ok(bot_info)
}
