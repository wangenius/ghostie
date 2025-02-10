use anyhow::Result;
use rand::Rng;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// 获取配置目录
pub fn get_config_dir() -> Option<PathBuf> {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).ok()?;
    let mut path = PathBuf::from(home);
    path.push(".pip-shell");
    Some(path)
}

/// 保存文件
pub fn save_file(content: &str, file_path: &PathBuf) -> Result<()> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(file_path, content)?;
    Ok(())
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
