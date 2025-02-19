use anyhow::Result;
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(serde::Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

/// 获取配置目录，如果目录不存在则创建
pub fn get_config_dir() -> Option<PathBuf> {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).ok()?;
    let mut path = PathBuf::from(home);
    path.push(".ghostie");

    // 如果目录不存在，尝试创建
    if !path.exists() {
        if let Err(_) = fs::create_dir_all(&path) {
            return None;
        }
    }

    Some(path)
}

#[tauri::command]
pub async fn open_files_path(
    window: tauri::Window,
    title: String,
    filters: std::collections::HashMap<String, Vec<String>>,
) -> Result<Vec<String>, String> {
    let mut file_dialog = window.dialog().file().set_title(&title).set_parent(&window);

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

    let file_paths = file_dialog.blocking_pick_files();

    match file_paths {
        Some(paths) => Ok(paths.iter().map(|p| p.to_string()).collect()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn open_file(
    window: tauri::Window,
    title: String,
    filters: std::collections::HashMap<String, Vec<String>>,
) -> Result<Option<FileContent>, String> {
    let mut file_dialog = window.dialog().file().set_title(&title).set_parent(&window);

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
    window: tauri::Window,
    title: String,
    default_name: String,
    filters: std::collections::HashMap<String, Vec<String>>,
    content: String,
) -> Result<bool, String> {
    let mut file_dialog = window
        .dialog()
        .file()
        .set_file_name(default_name)
        .set_title(&title)
        .set_parent(&window);

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
