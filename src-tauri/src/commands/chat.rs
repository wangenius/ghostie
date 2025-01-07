use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use futures::StreamExt;
use tauri::Emitter;


use crate::llm::{
    bots::BotsConfig,
    config::Config,
    llm_provider::{LLMProvider, Message, Provider},
};

// LLM 对话相关命令
#[tauri::command]
pub async fn chat(
    window: tauri::Window,
    messages: Vec<Message>,
    bot: Option<String>,
) -> Result<String, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    let (_, model_config) = config.get_current_model().ok_or("No model configured")?;

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
    let _ = config
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
pub async fn set_system_prompt(prompt: Option<String>) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.set_system_prompt(prompt).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_prompt() -> Result<Option<String>, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    Ok(config.system_prompt.clone())
}

#[tauri::command]
pub async fn set_stream_output(enabled: bool) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.set_stream(enabled).map_err(|e| e.to_string())
} 