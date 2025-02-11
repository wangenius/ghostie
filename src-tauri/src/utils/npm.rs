use crate::utils::utils;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageInfo {
    name: String,
    version: String,
    description: Option<String>,
}

pub async fn init_npm_package() -> Result<(), String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    // 检查 package.json 是否存在
    if !temp_dir.join("package.json").exists() {
        // 尝试使用完整路径
        let output = Command::new("npm.cmd")
            .arg("init")
            .arg("-y")
            .current_dir(&temp_dir)
            .output()
            .map_err(|e| format!("Failed to execute npm init: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("npm init failed: {}", error));
        }
        println!("Successfully initialized package.json");
    }
    Ok(())
}

#[tauri::command]
pub async fn get_npm_package(_: tauri::AppHandle, name: String) -> Result<String, String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");

    // 创建临时的入口文件
    let entry_content = format!(
        "const mod = require('{}');
         if (typeof mod === 'function' || (typeof mod === 'object' && !mod.default)) {{
             window.__MODULE__ = mod;
         }} else {{
             window.__MODULE__ = {{ ...mod.default, ...mod }};
         }}",
        name
    );
    let entry_file = temp_dir.join("temp_entry.js");
    std::fs::write(&entry_file, entry_content).map_err(|e| e.to_string())?;

    // 使用 esbuild 打包，添加更多配置
    let output = Command::new("npx.cmd")
        .arg("esbuild")
        .arg(entry_file.to_str().unwrap())
        .arg("--bundle")
        .arg("--format=iife")
        .arg("--platform=browser")
        .arg("--target=es2015")
        .arg("--minify")
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    // 清理临时文件
    std::fs::remove_file(entry_file).ok();

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("打包失败: {}", error));
    }

    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_package(
    _: tauri::AppHandle,
    name: String,
    version: Option<String>,
) -> Result<(String, String), String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("创建临时目录失败: {}", e))?;

    // 创建临时的 package.json
    let package_json = r#"{"name": "temp", "version": "1.0.0"}"#;
    std::fs::write(temp_dir.join("package.json"), package_json)
        .map_err(|e| format!("创建 package.json 失败: {}", e))?;

    let package_spec = match version {
        Some(v) => format!("{}@{}", name, v),
        None => name.clone(),
    };

    // 在临时目录中安装包
    let output = Command::new("npm.cmd")
        .arg("install")
        .arg(&package_spec)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        // 清理临时目录
        std::fs::remove_dir_all(&temp_dir).ok();
        return Err(format!("安装失败: {}", error));
    }

    // 打包
    let entry_content = format!(
        "const mod = require('{}');
         if (typeof mod === 'function' || (typeof mod === 'object' && !mod.default)) {{
             window.__MODULE__ = mod;
         }} else {{
             window.__MODULE__ = {{ ...mod.default, ...mod }};
         }}",
        name
    );
    let entry_file = temp_dir.join("temp_entry.js");
    std::fs::write(&entry_file, entry_content).map_err(|e| e.to_string())?;

    let output = Command::new("npx.cmd")
        .arg("esbuild")
        .arg(entry_file.to_str().unwrap())
        .arg("--bundle")
        .arg("--format=iife")
        .arg("--platform=browser")
        .arg("--target=es2015")
        .arg("--minify")
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    // 清理临时文件和目录
    std::fs::remove_file(&entry_file).ok();
    std::fs::remove_dir_all(&temp_dir).ok();

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("打包失败: {}", error));
    }

    let bundle = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;

    Ok((name, bundle))
}
