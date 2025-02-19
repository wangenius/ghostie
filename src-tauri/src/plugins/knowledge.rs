// 常量定义
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE: usize = 300;
const EMBEDDING_DIMENSION: usize = 1024;
const KNOWLEDGE_VERSION: &str = "1.0.0";

use crate::utils::file::get_config_dir;
use crate::utils::gen::generate_id;
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TextChunkMetadata {
    source_page: Option<u32>,
    paragraph_number: Option<u32>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TextChunk {
    content: String,
    embedding: Vec<f32>,
    metadata: TextChunkMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeFile {
    name: String,
    content: String,
    file_type: String,
    chunks: Vec<TextChunk>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Knowledge {
    id: String,
    name: String,
    version: String,
    tags: Vec<String>,
    category: Option<String>,
    files: Vec<KnowledgeFile>,
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
        // 确保知识库目录存在
        if let Some(mut config_dir) = get_config_dir() {
            config_dir.push("knowledge");
            if !config_dir.exists() {
                let _ = fs::create_dir_all(&config_dir);
            }
        }

        let items = Self::load_all_knowledge().unwrap_or_default();
        Self {
            items: Mutex::new(items),
        }
    }

    fn get_knowledge_dir() -> Option<PathBuf> {
        let mut path = get_config_dir()?;
        path.push("knowledge");
        Some(path)
    }

    fn get_knowledge_file_path(id: &str) -> Option<PathBuf> {
        let mut path = Self::get_knowledge_dir()?;
        path.push(format!("{}.json", id));
        Some(path)
    }

    fn load_all_knowledge() -> Result<Vec<Knowledge>, String> {
        let dir = Self::get_knowledge_dir().ok_or("无法获取知识库目录")?;
        if !dir.exists() {
            return Ok(Vec::new());
        }

        let mut items = Vec::new();
        for entry in fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))? {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(knowledge) = serde_json::from_str(&content) {
                            items.push(knowledge);
                        }
                    }
                }
            }
        }
        Ok(items)
    }

    fn save_to_disk(&self) -> Result<(), String> {
        let items = self.items.lock().unwrap();
        let knowledge_dir = Self::get_knowledge_dir().ok_or("无法获取知识库目录")?;

        // 确保目录存在
        if !knowledge_dir.exists() {
            fs::create_dir_all(&knowledge_dir).map_err(|e| format!("创建目录失败: {}", e))?;
        }

        // 保存每个知识库到独立的文件
        for knowledge in items.iter() {
            let file_path =
                Self::get_knowledge_file_path(&knowledge.id).ok_or("无法创建知识库文件路径")?;
            let json = serde_json::to_string_pretty(&knowledge)
                .map_err(|e| format!("序列化失败: {}", e))?;
            fs::write(&file_path, json).map_err(|e| format!("写入文件失败: {}", e))?;
        }
        Ok(())
    }
}

fn get_api_key_path() -> Option<PathBuf> {
    let mut path = get_config_dir()?;
    path.push("aliyun_api_key.txt");
    Some(path)
}

fn split_text_into_chunks(text: &str, chunk_size: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let sentences: Vec<&str> = text
        .split(|c| c == '.' || c == '。' || c == '!' || c == '?' || c == '\n')
        .filter(|s| !s.trim().is_empty())
        .collect();

    let mut current_chunk = String::new();
    let mut current_chars = 0;

    for sentence in sentences {
        let sentence_chars = sentence.chars().count();

        // 如果当前块加上新句子会超过限制
        if current_chars + sentence_chars > chunk_size {
            if !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());

                // 保留最后一个完整句子作为重叠部分
                if let Some(last_sentence) = current_chunk
                    .split(|c| c == '.' || c == '。' || c == '!' || c == '?' || c == '\n')
                    .last()
                {
                    current_chunk = last_sentence.trim().to_string();
                    current_chars = current_chunk.chars().count();
                } else {
                    current_chunk.clear();
                    current_chars = 0;
                }
            }
        }

        // 添加新句子
        if !sentence.trim().is_empty() {
            if !current_chunk.is_empty() {
                current_chunk.push(' ');
                current_chars += 1;
            }
            current_chunk.push_str(sentence.trim());
            current_chars += sentence_chars;
        }
    }

    // 添加最后一个块
    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    chunks
}

// 添加文件验证函数
fn validate_file(file_path: &str) -> Result<(), String> {
    let metadata = fs::metadata(file_path).map_err(|e| format!("无法读取文件信息: {}", e))?;

    if metadata.len() as usize > MAX_FILE_SIZE {
        return Err(format!(
            "文件大小超过限制 {}MB",
            MAX_FILE_SIZE / 1024 / 1024
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn get_aliyun_api_key() -> Result<String, String> {
    let api_key_path = get_api_key_path().ok_or("无法获取 API Key 文件路径")?;
    match fs::read_to_string(api_key_path) {
        Ok(key) => Ok(key),
        Err(_) => Ok("".to_string()),
    }
}

#[tauri::command]
pub fn save_aliyun_api_key(key: String) -> Result<(), String> {
    let api_key_path = get_api_key_path().ok_or("无法获取 API Key 文件路径")?;

    // 确保配置目录存在
    if let Some(config_dir) = get_config_dir() {
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
        }
    }

    fs::write(api_key_path, &key).map_err(|e| format!("保存 API Key 失败: {}", e))?;
    Ok(())
}

async fn text_to_embedding(text: &str) -> Result<Vec<f32>, String> {
    let api_key_path = get_api_key_path().ok_or("无法获取 API Key 文件路径")?;
    let api_key = fs::read_to_string(api_key_path).map_err(|_| "未找到 API Key".to_string())?;

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
    let query_embedding = text_to_embedding(&query).await?;
    let threshold = threshold.unwrap_or(0.7);
    let limit = limit.unwrap_or(10);

    let items = state.items.lock().unwrap();
    let mut results = Vec::new();

    // 遍历所有文档的所有文件的所有文本块
    for doc in items.iter() {
        for file in &doc.files {
            for chunk in &file.chunks {
                let similarity = cosine_similarity(&query_embedding, &chunk.embedding);
                if similarity > threshold {
                    results.push(SearchResult {
                        content: chunk.content.clone(),
                        similarity,
                        document_name: format!("{}/{}", doc.name, file.name),
                        document_id: doc.id.clone(),
                    });
                }
            }
        }
    }

    results.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    results.truncate(limit);

    Ok(results)
}

#[tauri::command]
pub async fn upload_knowledge_file(
    state: State<'_, KnowledgeState>,
    file_paths: Vec<String>,
    knowledge_name: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Knowledge, String> {
    // 验证所有文件
    for file_path in &file_paths {
        validate_file(file_path)?;
    }

    let mut files = Vec::new();
    for file_path in file_paths {
        let extension = std::path::Path::new(&file_path)
            .extension()
            .and_then(|ext| ext.to_str())
            .ok_or("无效的文件类型")?
            .to_lowercase();

        if !["txt", "md", "markdown"].contains(&extension.as_str()) {
            return Err(format!(
                "文件 {} 类型不支持，仅支持 TXT 和 Markdown 文件",
                file_path
            ));
        }

        // 读取文件内容
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("读取文件 {} 失败: {}", file_path, e))?;

        // 文本分块
        let text_chunks = split_text_into_chunks(&content, CHUNK_SIZE);

        println!("text_chunks: {:?}", text_chunks);

        // 为每个分块生成向量
        let mut chunks = Vec::new();
        for (i, chunk_text) in text_chunks.iter().enumerate() {
            let embedding = text_to_embedding(&chunk_text).await?;
            println!("embedding: {:?}", embedding);
            // 验证向量维度
            if embedding.len() != EMBEDDING_DIMENSION {
                return Err(format!(
                    "向量维度错误: 期望 {}, 实际 {}",
                    EMBEDDING_DIMENSION,
                    embedding.len()
                ));
            }

            chunks.push(TextChunk {
                content: chunk_text.clone(),
                embedding,
                metadata: TextChunkMetadata {
                    source_page: None,
                    paragraph_number: Some(i as u32 + 1),
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                },
            });
        }

        let now = chrono::Utc::now().timestamp();
        let file = KnowledgeFile {
            name: std::path::Path::new(&file_path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("未知文件")
                .to_string(),
            content,
            file_type: extension,
            chunks,
            created_at: now,
            updated_at: now,
        };

        files.push(file);
    }

    // 使用用户指定的名称或生成默认名称
    let knowledge_name = knowledge_name.unwrap_or_else(|| {
        if let Some(first_file) = files.first() {
            first_file.name.clone()
        } else {
            format!("知识库_{}", chrono::Local::now().format("%Y%m%d_%H%M%S"))
        }
    });

    let now = chrono::Utc::now().timestamp();
    let knowledge = Knowledge {
        id: generate_id(),
        name: knowledge_name,
        version: KNOWLEDGE_VERSION.to_string(),
        tags: tags.unwrap_or_default(),
        category,
        files,
        created_at: now,
        updated_at: now,
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
