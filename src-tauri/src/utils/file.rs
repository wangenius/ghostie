use crate::utils::document::{read_docx, read_pdf};
use anyhow::Result;
use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(serde::Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[derive(serde::Serialize)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: u64,
    pub created: u64,
    pub is_dir: bool,
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
) -> Result<Vec<FileMetadata>, String> {
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
        Some(paths) => {
            let mut metadata_list = Vec::new();
            for path in paths {
                let path_ref = path.as_path().unwrap();
                if let Ok(metadata) = fs::metadata(path_ref) {
                    metadata_list.push(FileMetadata {
                        path: path_ref.to_string_lossy().to_string(),
                        name: path_ref
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default(),
                        size: metadata.len(),
                        modified: metadata
                            .modified()
                            .map(|time| {
                                time.duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs()
                            })
                            .unwrap_or_default(),
                        created: metadata
                            .created()
                            .map(|time| {
                                time.duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs()
                            })
                            .unwrap_or_default(),
                        is_dir: metadata.is_dir(),
                    });
                }
            }
            Ok(metadata_list)
        }
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

#[tauri::command]
pub async fn read_file_text(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");

    match extension.to_lowercase().as_str() {
        "docx" => {
            read_docx(&path.to_string_lossy()).map_err(|e| format!("读取 DOCX 文件失败: {}", e))
        }
        "pdf" => read_pdf(&path.to_string_lossy()).map_err(|e| format!("读取 PDF 文件失败: {}", e)),
        _ => fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e)),
    }
}
