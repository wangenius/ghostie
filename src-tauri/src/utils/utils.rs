use anyhow::Result;
use rand::Rng;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_dialog::DialogExt;
/// 获取配置目录
pub fn get_config_dir() -> Option<PathBuf> {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).ok()?;
    let mut path = PathBuf::from(home);
    path.push(".pip-shell");
    Some(path)
}

pub fn gen_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let chars: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();

    let mut id = String::with_capacity(16);

    // 使用时间戳生成前8位
    for i in 0..8 {
        let index = ((timestamp >> (i * 4)) ^ (timestamp >> (i * 3))) as usize & 0x3f;
        id.push(chars[index] as char);
    }

    // 使用随机数生成后8位
    for _ in 0..8 {
        let index = rng.gen_range(0..chars.len());
        id.push(chars[index] as char);
    }

    id
}

#[derive(serde::Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[tauri::command]
pub async fn open_file(
    app: tauri::AppHandle,
    title: String,
    filters: std::collections::HashMap<String, Vec<String>>,
) -> Result<Option<FileContent>, String> {
    let mut file_dialog = app.dialog().file().set_title(&title);

    for (name, extensions) in filters.iter() {
        file_dialog = file_dialog.add_filter(
            name,
            extensions
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<&str>>()
                .as_slice(),
        );
    }

    let file_path = file_dialog.blocking_pick_file();

    if let Some(path) = file_path {
        let path_str = path.to_string();
        match fs::read_to_string(&path_str) {
            Ok(content) => Ok(Some(FileContent {
                path: path_str,
                content,
            })),
            Err(e) => Err(format!("读取文件失败: {}", e)),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn save_file(
    app: tauri::AppHandle,
    title: String,
    default_name: String,
    filters: std::collections::HashMap<String, Vec<String>>,
    content: String,
) -> Result<bool, String> {
    let mut file_dialog = app
        .dialog()
        .file()
        .set_file_name(default_name)
        .set_title(&title);

    for (name, extensions) in filters.iter() {
        file_dialog = file_dialog.add_filter(
            name,
            extensions
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<&str>>()
                .as_slice(),
        );
    }

    let file_path = file_dialog.blocking_save_file();

    if let Some(path) = file_path {
        let path_str = path.to_string();
        match fs::write(&path_str, content) {
            Ok(_) => Ok(true),
            Err(e) => Err(format!("保存文件失败: {}", e)),
        }
    } else {
        Ok(false)
    }
}
