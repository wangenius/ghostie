use futures_util::StreamExt;
use once_cell::sync::Lazy;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Runtime};
use tokio::sync::{mpsc, oneshot};

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
            window.clone().emit(&format!("chat-stream-error-{}", request_id), e.to_string()).unwrap();
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
    let (tx, mut rx) = mpsc::channel(100);
    let (cancel_tx, mut cancel_rx) = oneshot::channel();

    // 存储取消通道
    CANCEL_CHANNELS
        .lock()
        .unwrap()
        .insert(request_id.clone(), cancel_tx);

    // 在新线程中处理流数据
    let window_clone = window.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                chunk_option = stream.next() => {
                    match chunk_option {
                        Some(chunk_result) => {
                            match chunk_result {
                                Ok(chunk) => {
                                    let text = String::from_utf8_lossy(&chunk);
                                    let lines: Vec<&str> = text.split('\n').collect();

                                    for line in lines {
                                        if let Err(e) = window_clone.emit(&format!("chat-stream-{}", request_id), line) {
                                                eprintln!("Failed to emit event: {}", e);
                                            }
                                    }
                                }
                                Err(e) => {
                                    if let Err(emit_err) = window_clone.emit(&format!("chat-stream-error-{}", request_id), e.to_string()) {
                                        eprintln!("Failed to emit error event: {}", emit_err);
                                    }
                                    break;
                                }
                            }
                        }
                        None => break,
                    }
                }
                _ = &mut cancel_rx => {
                    break;
                }
            }
        }
        // 清理取消通道
        CANCEL_CHANNELS.lock().unwrap().remove(&request_id);
        let _ = tx.send(()).await;
    });

    // 等待流处理完成
    let _ = rx.recv().await;
    Ok(())
}

#[tauri::command]
pub async fn cancel_stream(request_id: String) -> Result<(), String> {
    if let Some(cancel_tx) = CANCEL_CHANNELS.lock().unwrap().remove(&request_id) {
        let _ = cancel_tx.send(());
    }
    Ok(())
}
