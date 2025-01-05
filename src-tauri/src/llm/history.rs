use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use crate::llm::utils;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatHistory {
    pub id: String,
    pub title: String,
    pub timestamp: DateTime<Utc>,
    pub preview: String,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub bot: String,
    pub content: String,
}

impl ChatHistory {
    pub fn new(id: String) -> Self {
        Self {
            id,
            title: String::new(),
            timestamp: Utc::now(),
            preview: String::new(),
            messages: Vec::new(),
        }
    }

    pub fn update(&mut self, title: String, preview: String, messages: Vec<ChatMessage>) {
        self.title = title;
        self.preview = preview;
        self.messages = messages;
        self.timestamp = Utc::now();
    }
}

pub struct HistoryManager;

impl HistoryManager {
    pub fn get_history_dir() -> Result<PathBuf> {
        let mut path = utils::get_config_dir().ok_or_else(|| anyhow::anyhow!("无法获取配置目录"))?;
        path.push("histories");
        if !path.exists() {
            fs::create_dir_all(&path)?;
        }
        Ok(path)
    }

    pub fn create_history() -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let history = ChatHistory::new(id.clone());
        Self::save_history(&history)?;
        Ok(id)
    }

    pub fn update_history(id: &str, title: String, preview: String, messages: Vec<ChatMessage>) -> Result<()> {
        let mut history = if let Some(mut path) = Self::get_history_dir().ok() {
            path.push(format!("{}.json", id));
            if path.exists() {
                let content = fs::read_to_string(path)?;
                serde_json::from_str(&content)?
            } else {
                ChatHistory::new(id.to_string())
            }
        } else {
            ChatHistory::new(id.to_string())
        };

        history.update(title, preview, messages);
        Self::save_history(&history)
    }

    pub fn save_history(history: &ChatHistory) -> Result<()> {
        let mut path = Self::get_history_dir()?;
        path.push(format!("{}.json", history.id));
        let content = serde_json::to_string_pretty(history)?;
        fs::write(path, content)?;
        Ok(())
    }

    pub fn list_histories() -> Result<Vec<ChatHistory>> {
        let path = Self::get_history_dir()?;
        let mut histories = Vec::new();
        
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                let content = fs::read_to_string(entry.path())?;
                let history: ChatHistory = serde_json::from_str(&content)?;
                histories.push(history);
            }
        }
        
        // 按时间倒序排序
        histories.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        Ok(histories)
    }

    pub fn delete_history(id: &str) -> Result<()> {
        let mut path = Self::get_history_dir()?;
        path.push(format!("{}.json", id));
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }
} 