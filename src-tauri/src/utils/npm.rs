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
) -> Result<(), String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");
    println!("安装包: {}", name);

    let package_spec = match version {
        Some(v) => format!("{}@{}", name, v),
        None => name,
    };

    println!("package_spec: {}", package_spec);

    Command::new("npm.cmd")
        .arg("install")
        .arg(&package_spec)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn uninstall_package(name: String) -> Result<(), String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");

    Command::new("npm.cmd")
        .arg("uninstall")
        .arg(&name)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn list_packages(_: tauri::AppHandle) -> Result<Vec<PackageInfo>, String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");

    if !temp_dir.exists() {
        return Ok(Vec::new());
    }

    let output = Command::new("npm.cmd")
        .arg("list")
        .arg("--json")
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| e.to_string())?;

    let output_str = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&output_str).map_err(|e| e.to_string())?;

    let mut packages = Vec::new();
    if let Some(deps) = json["dependencies"].as_object() {
        for (name, info) in deps {
            if let Some(version) = info["version"].as_str() {
                packages.push(PackageInfo {
                    name: name.clone(),
                    version: version.to_string(),
                    description: info["description"].as_str().map(String::from),
                });
            }
        }
    }

    Ok(packages)
}

#[tauri::command]
pub async fn check_package_installed(_: tauri::AppHandle, name: String) -> Result<bool, String> {
    let temp_dir = utils::get_config_dir().unwrap().join("npm");
    let package_dir = temp_dir.join("node_modules").join(&name);
    Ok(package_dir.exists())
}
