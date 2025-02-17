use crate::utils::gen::generate_id;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Knowledge {
    id: String,
    name: String,
    content: String,
    file_type: String,
    embedding: Vec<f32>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Default)]
pub struct KnowledgeState {
    items: Mutex<Vec<Knowledge>>,
}

#[tauri::command]
pub async fn upload_knowledge_file(
    state: State<'_, KnowledgeState>,
    file_path: String,
    content: String,
) -> Result<Knowledge, String> {
    // 从文件路径中提取文件类型
    let extension = std::path::Path::new(&file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or("无效的文件类型")?
        .to_lowercase();

    if !["txt", "md", "markdown"].contains(&extension.as_str()) {
        return Err("仅支持 TXT 和 Markdown 文件".to_string());
    }

    // TODO: 调用 embedding 模型生成向量
    // 这里暂时使用空向量，后续需要集成实际的 embedding 模型
    let embedding = Vec::new();

    let knowledge = Knowledge {
        id: generate_id(),
        name: std::path::Path::new(&file_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("未知文件")
            .to_string(),
        content,
        file_type: extension,
        embedding,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    state.items.lock().unwrap().push(knowledge.clone());

    Ok(knowledge)
}

#[tauri::command]
pub fn get_knowledge_list(state: State<KnowledgeState>) -> Vec<Knowledge> {
    state.items.lock().unwrap().clone()
}

#[tauri::command]
pub fn delete_knowledge(state: State<KnowledgeState>, id: String) -> Result<(), String> {
    let mut items = state.items.lock().unwrap();
    if let Some(index) = items.iter().position(|k| k.id == id) {
        items.remove(index);
        Ok(())
    } else {
        Err("知识库不存在".to_string())
    }
}
