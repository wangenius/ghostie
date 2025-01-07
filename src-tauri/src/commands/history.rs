use crate::llm::history::{ChatHistory, ChatMessage, HistoryManager};

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