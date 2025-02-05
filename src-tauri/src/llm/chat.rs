use crate::bots::bot::BotsConfig;
use crate::llm::history::{ChatHistory, ChatMessage, HistoryManager};
use futures::StreamExt;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::Emitter;

use crate::llm::llm::{LLMProvider, Message, Provider};
use crate::model::manager::ModelManager;

// LLM 对话相关命令
#[tauri::command]
pub async fn chat(
    window: tauri::Window,
    messages: Vec<Message>,
    bot: Option<String>,
) -> Result<String, String> {
    let model_config = ModelManager::get_current().ok_or("No model configured")?;

    // 获取当前 bot 的系统提示词
    let mut all_messages = Vec::new();
    let bots_config = BotsConfig::load().map_err(|e| e.to_string())?;
    if let Some(bot) = bots_config.get(bot.as_deref().unwrap_or("")) {
        all_messages.push(Message {
            role: "system".to_string(),
            content: bot.system_prompt.clone(),
        });
    } else {
        all_messages.push(Message {
            role: "system".to_string(),
            content: "".to_string(),
        });
    }
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config
        .update_recent_bots(bot.as_deref().unwrap_or(""))
        .map_err(|e| e.to_string())?;
    // 添加历史消息
    all_messages.extend(messages);
    println!("all_messages: {:?}", all_messages);
    let provider = Provider::new(model_config.api_key.clone())
        .with_url(model_config.api_url.clone())
        .with_model(model_config.model.clone());
    let running = Arc::new(AtomicBool::new(true));
    let mut stream = LLMProvider::chat(&provider, all_messages, true, running.clone())
        .await
        .map_err(|e| e.to_string())?;

    let mut response = String::new();
    while let Some(chunk) = stream.next().await {
        let text = chunk.map_err(|e| e.to_string())?;
        if !text.is_empty() {
            response.push_str(&text);
            // 发送流式响应到前端，确保每个块只发送一次
            let _ = window.emit("chat-response", text.clone());
        }
    }
    // 发送聊天完成事件
    let _ = window.emit("chat-complete", ());
    println!("response: {}", response);
    Ok(response)
}

#[tauri::command]
pub async fn create_chat_history() -> Result<String, String> {
    HistoryManager::create_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_chat_history(
    id: String,
    title: String,
    preview: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    HistoryManager::update_history(&id, title, preview, messages).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_histories() -> Result<Vec<ChatHistory>, String> {
    HistoryManager::list_histories().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_history(id: String) -> Result<(), String> {
    HistoryManager::delete_history(&id).map_err(|e| e.to_string())
}
