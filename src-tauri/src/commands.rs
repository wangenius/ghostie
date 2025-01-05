use futures::StreamExt;
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::{Emitter, Manager, WindowEvent};

use crate::llm::{
    agents::{
        executor::CommandExecutor,
        types::{Agent, AgentManager},
    },
    bots::{Bot, BotsConfig},
    config::Config,
    history::{ChatHistory, ChatMessage, HistoryManager},
    llm_provider::{LLMProvider, Message, Provider},
};

// LLM 配置相关命令
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

// Bot 相关命令
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
pub async fn list_bots() -> Result<serde_json::Value, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    let mut bots = Vec::new();

    // 收集所有 bots
    for (name, bot) in &config.bots {
        let mut bot_info = serde_json::Map::new();
        bot_info.insert("name".to_string(), serde_json::Value::String(name.clone()));
        bot_info.insert(
            "system_prompt".to_string(),
            serde_json::Value::String(bot.system_prompt.clone()),
        );
        bots.push(serde_json::Value::Object(bot_info));
    }

    // 构建返回结果
    let mut result = serde_json::Map::new();
    result.insert("bots".to_string(), serde_json::Value::Array(bots));
    result.insert(
        "recent_bots".to_string(),
        serde_json::Value::Array(
            config
                .recent_bots
                .iter()
                .map(|name| serde_json::Value::String(name.clone()))
                .collect(),
        ),
    );

    Ok(serde_json::Value::Object(result))
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

// Agent 相关命令
#[tauri::command]
pub async fn add_agent(
    name: String,
    description: Option<String>,
    system_prompt: String,
    env: HashMap<String, String>,
    templates: HashMap<String, String>,
) -> Result<(), String> {
    let agent = Agent {
        name: name.clone(),
        description,
        system_prompt,
        env,
        templates,
    };
    let mut manager = AgentManager::new();
    manager.load_agent(&name, agent);
    Ok(())
}

#[tauri::command]
pub async fn remove_agent(name: String) -> Result<(), String> {
    let mut manager = AgentManager::new();
    manager
        .remove_agent(&name)
        .ok_or_else(|| "Agent not found".to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_agent(name: String) -> Result<Option<Agent>, String> {
    let manager = AgentManager::new();
    Ok(manager.get_agent(&name).cloned())
}

#[tauri::command]
pub async fn execute_agent_command(
    agent_name: String,
    command: String,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let manager = AgentManager::new();
    let agent = manager.get_agent(&agent_name).ok_or("Agent not found")?;

    let mut command_env = agent.env.clone();
    if let Some(additional_env) = env {
        command_env.extend(additional_env);
    }

    let executor = CommandExecutor::new(command_env);
    executor.execute(&command).await.map_err(|e| e.to_string())
}

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
    Ok(response)
}

// 系统设置相关命令
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

#[tauri::command]
pub async fn open_window(app: tauri::AppHandle, name: String) -> Result<(), String> {
    println!("open_window: {}", name);
    let window = app
        .get_webview_window(&name)
        .ok_or(format!("Failed to create {} window", name))?;
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            let _ = window_clone.hide();
            api.prevent_close();
        }
    });
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_window_with_query(
    app: tauri::AppHandle,
    name: String,
    query: HashMap<String, String>,
) -> Result<(), String> {
    let window = app
        .get_webview_window(&name)
        .ok_or_else(|| format!("Window {} not found", name))?;

    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            let _ = window_clone.hide();
            api.prevent_close();
        }
    });

    window
        .emit("query-params", query)
        .map_err(|e| format!("Failed to send query params: {}", e))?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    Ok(())
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

#[tauri::command]
pub fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}
