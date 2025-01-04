use anyhow::Result as AnyhowResult;
use futures::StreamExt;
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::Emitter;
use tauri::Manager;

use crate::llm::{
    agents::{
        executor::CommandExecutor,
        types::{Agent, AgentManager},
    },
    bots::{Bot, BotsConfig},
    config::Config,
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
pub async fn list_models() -> Result<Vec<(String, bool, String, String)>, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    let mut models = Vec::new();
    for (name, model_config) in &config.models {
        let is_current = config
            .current_model
            .as_ref()
            .map_or(false, |current| current == name);
        models.push((
            name.clone(),
            is_current,
            model_config.api_url.clone(),
            model_config.model.clone(),
        ));
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
pub async fn list_bots() -> Result<Vec<(String, bool, String)>, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    let mut bots = Vec::new();
    for (name, bot) in &config.bots {
        let is_current = config
            .current
            .as_ref()
            .map_or(false, |current| current == name);
        bots.push((name.clone(), is_current, bot.system_prompt.clone()));
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
pub async fn set_bot_alias(bot: String, alias: String) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config.set_alias(bot, alias).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_bot_alias(alias: String) -> Result<(), String> {
    let mut config = BotsConfig::load().map_err(|e| e.to_string())?;
    config.remove_alias(&alias).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_bot_aliases() -> Result<Vec<(String, String)>, String> {
    let config = BotsConfig::load().map_err(|e| e.to_string())?;
    Ok(config
        .aliases
        .iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect())
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
pub async fn chat(window: tauri::Window, messages: Vec<Message>) -> Result<String, String> {
    let config = Config::load().map_err(|e| e.to_string())?;
    let (_, model_config) = config.get_current_model().ok_or("No model configured")?;
    
    // 获取当前 bot 的系统提示词
    let mut all_messages = Vec::new();
    let bots_config = BotsConfig::load().map_err(|e| e.to_string())?;
    if let Some(bot) = bots_config.get_current() {
        all_messages.push(Message {
            role: "system".to_string(),
            content: bot.system_prompt.clone(),
        });
    } else if let Some(ref system_prompt) = config.system_prompt {
        all_messages.push(Message {
            role: "system".to_string(),
            content: system_prompt.clone(),
        });
    }
    
    // 添加历史消息
    all_messages.extend(messages);
    
    let provider = Provider::new(model_config.api_key.clone())
        .with_url(model_config.api_url.clone())
        .with_model(model_config.model.clone());
    
    let running = Arc::new(AtomicBool::new(true));
    println!("all_messages: {:?}", all_messages);
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
