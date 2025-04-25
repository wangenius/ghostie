use base64::Engine;
use futures_util::StreamExt;
use once_cell::sync::Lazy;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Runtime};
use tokio::sync::oneshot;

static CANCEL_CHANNELS: Lazy<Mutex<HashMap<String, oneshot::Sender<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// 全局HTTP客户端，避免每次请求都创建新客户端
static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .pool_max_idle_per_host(10) // 连接池设置
        .timeout(Duration::from_secs(30)) // 整体超时
        .connect_timeout(Duration::from_secs(10)) // 连接超时
        .tcp_keepalive(Some(Duration::from_secs(60))) // TCP保持活跃
        .build()
        .expect("Failed to create HTTP client")
});

#[tauri::command]
pub async fn chat_stream<R: Runtime>(
    window: tauri::Window<R>,
    api_url: String,
    api_key: String,
    request_id: String,
    request_body: serde_json::Value,
) -> Result<(), String> {
    // 使用全局客户端而不是每次创建新的
    let client = &*HTTP_CLIENT;

    // 构建请求头
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
    );

    // 预先构建请求，可以提前开始DNS解析和连接建立
    let request_builder = client
        .post(&api_url)
        .headers(headers)
        .json(&request_body)
        .timeout(Duration::from_secs(60)); // 为这个特定请求设置更长的超时

    println!("正在发送请求到: {}", api_url);
    let response = request_builder.send().await.map_err(|e| {
        println!("请求发送失败: {}", e);
        window
            .clone()
            .emit(&format!("chat-stream-error-{}", request_id), e.to_string())
            .unwrap();
        e.to_string()
    })?;

    // 检查响应状态
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.map_err(|e| e.to_string())?;
        println!("请求失败，状态码: {}, 错误信息: {}", status, error_text);
        return Err(format!("请求失败: {} - {}", status, error_text));
    }

    let mut stream = response.bytes_stream();
    let (cancel_tx, mut cancel_rx) = oneshot::channel();

    // 存储取消通道
    CANCEL_CHANNELS
        .lock()
        .unwrap()
        .insert(request_id.clone(), cancel_tx);

    // 使用缓冲处理以提高性能
    let mut buffer = Vec::new();

    // 直接处理流数据
    while let Some(chunk_result) = tokio::select! {
        chunk = stream.next() => chunk,
        _ = &mut cancel_rx => None,
    } {
        match chunk_result {
            Ok(chunk) => {
                // 积累数据到缓冲区
                buffer.extend_from_slice(&chunk);

                // 找到所有完整的行
                let mut processed = 0;
                let text = String::from_utf8_lossy(&buffer);
                let lines: Vec<&str> = text.split('\n').collect();

                // 处理所有完整的行，除了最后一行（可能不完整）
                for line in lines.iter().take(lines.len() - 1) {
                    if !line.is_empty() {
                        if let Err(e) = window.emit(&format!("chat-stream-{}", request_id), line) {
                            eprintln!("Failed to emit event: {}", e);
                        }
                    }
                    processed += line.len() + 1; // +1 for the newline
                }

                // 保留未处理的数据
                if processed > 0 {
                    buffer.drain(0..processed);
                }
            }
            Err(e) => {
                if let Err(emit_err) =
                    window.emit(&format!("chat-stream-error-{}", request_id), e.to_string())
                {
                    eprintln!("Failed to emit error event: {}", emit_err);
                }
                break;
            }
        }
    }

    // 处理缓冲区中的最后一行（如果有）
    if !buffer.is_empty() {
        let last_line = String::from_utf8_lossy(&buffer);
        if !last_line.is_empty() {
            if let Err(e) = window.emit(&format!("chat-stream-{}", request_id), last_line.as_ref())
            {
                eprintln!("Failed to emit event: {}", e);
            }
        }
    }

    // 清理取消通道
    CANCEL_CHANNELS.lock().unwrap().remove(&request_id);
    Ok(())
}

#[tauri::command]
pub async fn cancel_stream(request_id: String) -> Result<(), String> {
    if let Some(cancel_tx) = CANCEL_CHANNELS.lock().unwrap().remove(&request_id) {
        let _ = cancel_tx.send(());
    }
    Ok(())
}

#[tauri::command]
pub async fn image_generate(
    api_url: String,
    api_key: String,
    request_body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // 使用全局客户端
    let client = &*HTTP_CLIENT;

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
    );
    headers.insert("X-DashScope-Async", HeaderValue::from_static("enable"));

    println!("正在发送图像生成请求到: {}", api_url);
    let response = client
        .post(&api_url)
        .headers(headers)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("图像生成请求发送失败: {}", e);
            e.to_string()
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.map_err(|e| e.to_string())?;
        println!(
            "图像生成请求失败，状态码: {}, 错误信息: {}",
            status, error_text
        );
        return Err(format!("请求失败: {} - {}", status, error_text));
    }

    let response_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(response_json)
}

#[tauri::command]
pub async fn image_result(api_url: String, api_key: String) -> Result<serde_json::Value, String> {
    // 使用全局客户端
    let client = &*HTTP_CLIENT;

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
    );

    println!("正在获取图像生成结果: {}", api_url);
    let response = client
        .get(&api_url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| {
            println!("获取图像生成结果失败: {}", e);
            e.to_string()
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.map_err(|e| e.to_string())?;
        println!(
            "获取图像生成结果失败，状态码: {}, 错误信息: {}",
            status, error_text
        );
        return Err(format!("请求失败: {} - {}", status, error_text));
    }

    let mut response_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    // 如果任务成功完成，获取图片并转换为base64
    if let Some(output) = response_json.get("output") {
        if let Some(task_status) = output.get("task_status") {
            if task_status == "SUCCEEDED" {
                if let Some(results) = output.get("results") {
                    if let Some(first_result) = results.get(0) {
                        if let Some(url) = first_result.get("url") {
                            // 获取图片内容
                            let image_response = client
                                .get(url.as_str().unwrap())
                                .send()
                                .await
                                .map_err(|e| e.to_string())?;

                            let image_bytes =
                                image_response.bytes().await.map_err(|e| e.to_string())?;

                            // 转换为base64
                            let base64_image =
                                base64::engine::general_purpose::STANDARD.encode(&image_bytes);
                            let data_url = format!("data:image/png;base64,{}", base64_image);

                            // 创建新的结果对象
                            if let Some(output) = response_json.get_mut("output") {
                                if let Some(results) = output.get_mut("results") {
                                    if let Some(first_result) = results.get_mut(0) {
                                        if let Some(obj) = first_result.as_object_mut() {
                                            obj.insert(
                                                "base64".to_string(),
                                                serde_json::Value::String(data_url),
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(response_json)
}
