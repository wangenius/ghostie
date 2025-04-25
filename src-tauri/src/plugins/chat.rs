use base64::Engine;
use futures_util::StreamExt;
use once_cell::sync::Lazy;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Runtime};
use tokio::sync::oneshot;

static CANCEL_CHANNELS: Lazy<Mutex<HashMap<String, oneshot::Sender<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub async fn chat_stream<R: Runtime>(
    window: tauri::Window<R>,
    api_url: String,
    api_key: String,
    request_id: String,
    request_body: serde_json::Value,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    println!("request_body: {:#?}", request_body);

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
    );

    println!("正在发送请求到: {}", api_url);
    let response = client
        .post(&api_url)
        .headers(headers)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            println!("请求发送失败: {}", e);
            window
                .clone()
                .emit(&format!("chat-stream-error-{}", request_id), e.to_string())
                .unwrap();
            e.to_string()
        })?;

    println!("response: {:#?}", response);

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

    // 直接处理流数据
    while let Some(chunk_result) = tokio::select! {
        chunk = stream.next() => chunk,
        _ = &mut cancel_rx => None,
    } {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                let lines: Vec<&str> = text.split('\n').collect();

                for line in lines {
                    if !line.is_empty() {
                        println!("line: {}", line);
                        if let Err(e) = window.emit(&format!("chat-stream-{}", request_id), line) {
                            eprintln!("Failed to emit event: {}", e);
                        }
                    }
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
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

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
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

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
