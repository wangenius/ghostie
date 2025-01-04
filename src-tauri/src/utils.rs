use anyhow::Result;
use std::path::PathBuf;
use std::fs;
use std::env;
use std::process::Command;

pub fn get_config_dir() -> Option<PathBuf> {
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).ok()?;
    let mut path = PathBuf::from(home);
    path.push(".gpt-shell");
    Some(path)
}

pub fn save_file(content: &str, file_path: &PathBuf) -> Result<()> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(file_path, content)?;
    Ok(())
}

pub fn open_file_in_editor(path: &PathBuf) -> Result<()> {
    if cfg!(windows) {
        if Command::new("code").arg(path).spawn().is_err() {
            if Command::new("C:\\Windows\\System32\\notepad.exe")
                .arg(path)
                .spawn()
                .is_err()
            {
                println!("can not open editor, the file path is: {}", path.display());
            }
        }
    } else {
        if let Ok(editor) = env::var("EDITOR") {
            Command::new(editor).arg(path).spawn()?;
        } else {
            let editors = ["code", "vim", "nano", "gedit"];
            let mut opened = false;
            for editor in editors {
                if Command::new(editor).arg(path).spawn().is_ok() {
                    opened = true;
                    break;
                }
            }
            if !opened {
                Command::new("xdg-open").arg(path).spawn()?;
            }
        }
    }
    Ok(())
} 