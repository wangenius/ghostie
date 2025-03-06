use super::file::get_config_dir;
use open;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_config_dir(_: tauri::AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir().unwrap();
    open::that(config_dir).map_err(|e| format!("Failed to open config directory: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_url(app: tauri::AppHandle, url: &str) -> Result<(), String> {
    let _ = app.opener().open_path(url, None::<&str>);
    Ok(())
}
