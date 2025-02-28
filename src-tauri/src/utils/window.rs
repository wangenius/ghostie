use super::file::get_config_dir;
use open;
use std::collections::HashMap;
use tauri::{Emitter, LogicalSize, Manager, Size, WindowEvent};

#[tauri::command]
pub async fn open_window(
    app: tauri::AppHandle,
    name: String,
    query: Option<HashMap<String, String>>,
    config: Option<HashMap<String, f64>>,
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

    // 设置窗口大小（如果提供了配置）
    if let Some(config) = config {
        let width = config.get("width").unwrap_or(&0.0);
        let height = config.get("height").unwrap_or(&0.0);
        if *width > 0.0 && *height > 0.0 {
            window
                .set_size(Size::Logical(LogicalSize::new(*width, *height)))
                .map_err(|e| format!("Failed to set window size: {}", e))?;
        }
    }

    // 使用emit发送数据
    if let Some(query_params) = query {
        app.emit("window-params", query_params)
            .map_err(|e| format!("Failed to emit params: {}", e))?;
    }

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn hide_window(window: tauri::Window) -> Result<(), String> {
    window
        .hide()
        .map_err(|e| format!("Failed to hide window: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_config_dir(_: tauri::AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir().unwrap();
    open::that(config_dir).map_err(|e| format!("Failed to open config directory: {}", e))?;
    Ok(())
}
