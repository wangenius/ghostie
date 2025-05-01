use crate::utils::file;
use std::fs;
use std::path::PathBuf;

// 获取插件目录
fn get_plugin_dir() -> Result<PathBuf, String> {
    file::get_plugins_dir().ok_or_else(|| "无法获取插件目录".to_string())
}

// 获取插件文件路径
fn get_plugin_file_path(id: &str) -> Result<PathBuf, String> {
    let plugin_dir = get_plugin_dir()?;
    let file_path = plugin_dir.join(format!("{}.ts", id));
    Ok(file_path)
}

// 保存插件内容
#[tauri::command]
pub async fn plugin_save_content(id: String, content: String) -> Result<(), String> {
    let file_path = get_plugin_file_path(&id)?;

    fs::write(&file_path, content).map_err(|e| format!("保存插件内容失败: {}", e))?;

    Ok(())
}

// 获取插件内容
#[tauri::command]
pub async fn plugin_get_content(id: String) -> Result<String, String> {
    let file_path = get_plugin_file_path(&id)?;

    if !file_path.exists() {
        return Err(format!("插件文件不存在: {}", id));
    }

    fs::read_to_string(&file_path).map_err(|e| format!("读取插件内容失败: {}", e))
}

// 删除插件
#[tauri::command]
pub async fn plugin_delete(id: String) -> Result<(), String> {
    let file_path = get_plugin_file_path(&id)?;

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("删除插件文件失败: {}", e))?;
    }

    Ok(())
}

// 列出所有插件
#[tauri::command]
pub async fn plugin_list() -> Result<Vec<String>, String> {
    let plugin_dir = get_plugin_dir()?;

    let mut plugin_ids = Vec::new();

    for entry in fs::read_dir(plugin_dir).map_err(|e| format!("读取插件目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "ts") {
            if let Some(file_stem) = path.file_stem() {
                if let Some(id) = file_stem.to_str() {
                    plugin_ids.push(id.to_string());
                }
            }
        }
    }

    Ok(plugin_ids)
}
