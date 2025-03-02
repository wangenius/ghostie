use super::file::get_config_dir;
use open;

#[tauri::command]
pub async fn open_config_dir(_: tauri::AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir().unwrap();
    open::that(config_dir).map_err(|e| format!("Failed to open config directory: {}", e))?;
    Ok(())
}
