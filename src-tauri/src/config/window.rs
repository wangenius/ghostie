use std::collections::HashMap;
use tauri::{Emitter, Manager, WindowEvent};


#[tauri::command]
pub async fn open_window(
    app: tauri::AppHandle,
    name: String,
    query: Option<HashMap<String, String>>,
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

    window
        .emit("query-params", query)
        .map_err(|e| format!("Failed to send query params: {}", e))?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    Ok(())
}


#[tauri::command]
pub fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}
