use anyhow::Result;
use std::env;
use std::fs;
use std::path::PathBuf;

pub fn get_config_dir() -> Option<PathBuf> {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).ok()?;
    let mut path = PathBuf::from(home);
    path.push(".pip-shell");
    Some(path)
}

pub fn save_file(content: &str, file_path: &PathBuf) -> Result<()> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(file_path, content)?;
    Ok(())
}
