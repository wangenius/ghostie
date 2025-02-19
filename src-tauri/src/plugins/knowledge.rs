use crate::utils::gen::generate_id;
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::sync::Mutex;
use tauri::State;

const KNOWLEDGE_DB_FILE: &str = "knowledge_db.json";
const API_KEY_FILE: &str = "aliyun_api_key.txt";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TextChunk {
    content: String,
    embedding: Vec<f32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Knowledge {
    id: String,
    name: String,
    content: String,
    file_type: String,
    chunks: Vec<TextChunk>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    content: String,
    similarity: f32,
    document_name: String,
    document_id: String,
}

#[derive(Default, Serialize, Deserialize)]
pub struct KnowledgeState {
    items: Mutex<Vec<Knowledge>>,
}

impl KnowledgeState {
    pub fn new() -> Self {
        let items = if let Ok(content) = fs::read_to_string(KNOWLEDGE_DB_FILE) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };
        Self {
            items: Mutex::new(items),
        }
    }

    fn save_to_disk(&self) -> Result<(), String> {
        let items = self.items.lock().unwrap();
        let json =
            serde_json::to_string_pretty(&*items).map_err(|e| format!("序列化失败: {}", e))?;
        fs::write(KNOWLEDGE_DB_FILE, json).map_err(|e| format!("写入文件失败: {}", e))?;
        Ok(())
    }
}

fn split_text_into_chunks(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut chunks = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let end = (i + chunk_size).min(words.len());
        let chunk = words[i..end].join(" ");
        chunks.push(chunk);
        i += chunk_size - overlap;
    }

    chunks
}

#[tauri::command]
pub fn get_aliyun_api_key() -> Result<String, String> {
    match fs::read_to_string(API_KEY_FILE) {
        Ok(key) => Ok(key),
        Err(_) => Ok("".to_string()),
    }
}

#[tauri::command]
pub fn save_aliyun_api_key(key: String) -> Result<(), String> {
    fs::write(API_KEY_FILE, &key).map_err(|e| format!("保存 API Key 失败: {}", e))?;
    Ok(())
}

async fn text_to_embedding(text: &str) -> Result<Vec<f32>, String> {
    let api_key = fs::read_to_string(API_KEY_FILE).map_err(|_| "未找到 API Key".to_string())?;

    if api_key.is_empty() {
        return Err("API Key 未配置".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "text-embedding-v3",
            "input": [text],
            "dimension": "1024",
         "encoding_format": "float"
        }))
        .send()
        .await
        .map_err(|e| format!("API 调用失败: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API 调用失败: {}", error_text));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    println!("response_json: {:?}", response_json);

    // 从响应中提取 embedding 向量
    let embedding = response_json["data"][0]["embedding"]
        .as_array()
        .ok_or("无效的响应格式")?
        .iter()
        .map(|v| v.as_f64().unwrap_or_default() as f32)
        .collect();

    Ok(embedding)
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}

#[tauri::command]
pub async fn search_knowledge(
    state: State<'_, KnowledgeState>,
    query: String,
    threshold: Option<f32>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    // 获取查询文本的向量表示
    let query_embedding = text_to_embedding(&query).await?;
    let threshold = threshold.unwrap_or(0.7);
    let limit = limit.unwrap_or(10);

    let items = state.items.lock().unwrap();
    let mut results = Vec::new();

    // 遍历所有文档的所有文本块，计算相似度
    for doc in items.iter() {
        for chunk in &doc.chunks {
            let similarity = cosine_similarity(&query_embedding, &chunk.embedding);
            if similarity > threshold {
                results.push(SearchResult {
                    content: chunk.content.clone(),
                    similarity,
                    document_name: doc.name.clone(),
                    document_id: doc.id.clone(),
                });
            }
        }
    }

    // 按相似度降序排序
    results.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // 限制返回结果数量
    results.truncate(limit);

    Ok(results)
}

#[tauri::command]
pub async fn upload_knowledge_file(
    state: State<'_, KnowledgeState>,
    file_path: String,
    content: String,
) -> Result<Knowledge, String> {
    let extension = std::path::Path::new(&file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or("无效的文件类型")?
        .to_lowercase();

    if !["txt", "md", "markdown"].contains(&extension.as_str()) {
        return Err("仅支持 TXT 和 Markdown 文件".to_string());
    }

    // 文本分块
    let text_chunks = split_text_into_chunks(&content, 500, 50);

    // 为每个分块生成向量
    let mut chunks = Vec::new();
    for chunk_text in text_chunks {
        let embedding = text_to_embedding(&chunk_text).await?;
        chunks.push(TextChunk {
            content: chunk_text,
            embedding,
        });
    }

    let knowledge = Knowledge {
        id: generate_id(),
        name: std::path::Path::new(&file_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("未知文件")
            .to_string(),
        content,
        file_type: extension,
        chunks,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };

    state.items.lock().unwrap().push(knowledge.clone());
    state.save_to_disk()?;

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
        state.save_to_disk()?;
        Ok(())
    } else {
        Err("知识库不存在".to_string())
    }
}
