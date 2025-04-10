pub mod env;
pub mod error;
pub mod plugin;
pub mod runtime;

pub use env::{EnvManager, EnvVar};
pub use error::{PluginError, Result};
use once_cell::sync::Lazy;
pub use plugin::{Plugin, PluginManager, PluginWithContent, Tool};
pub use runtime::DenoRuntime;
use serde_json::Value;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// 全局状态
static APP_HANDLE: Lazy<Mutex<Option<AppHandle>>> = Lazy::new(|| Mutex::new(None));
static PLUGIN_MANAGER: Lazy<Mutex<Option<PluginManager>>> = Lazy::new(|| Mutex::new(None));
static ENV_MANAGER: Lazy<Mutex<Option<EnvManager>>> = Lazy::new(|| Mutex::new(None));
static DENO_RUNTIME: Lazy<Mutex<Option<DenoRuntime>>> = Lazy::new(|| Mutex::new(None));

/// 初始化管理器
pub async fn init() -> Result<()> {
    let mut plugin_manager = PLUGIN_MANAGER.lock().await;
    if plugin_manager.is_none() {
        *plugin_manager = Some(PluginManager::new()?);
    }

    let mut env_manager = ENV_MANAGER.lock().await;
    if env_manager.is_none() {
        *env_manager = Some(EnvManager::new()?);
    }

    let mut runtime = DENO_RUNTIME.lock().await;
    if runtime.is_none() {
        *runtime = Some(DenoRuntime::new()?);
    }
    Ok(())
}

/// 设置 AppHandle
pub async fn set_app_handle(handle: AppHandle) {
    let mut app_handle = APP_HANDLE.lock().await;
    *app_handle = Some(handle);
}

/// 获取 AppHandle
pub async fn get_app_handle() -> Option<AppHandle> {
    APP_HANDLE.lock().await.clone()
}

/// 安装 Deno
#[tauri::command]
pub async fn deno_install(window: tauri::Window) -> Result<bool> {
    println!("开始安装 Deno...");
    let mut cmd = Command::new("powershell");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd
        .arg("irm")
        .arg("https://deno.land/install.ps1")
        .arg("|")
        .arg("iex")
        .stdout(std::process::Stdio::piped())
        .spawn()?;

    let stdout = child.stdout.take().unwrap();

    // 创建异步读取器
    let mut stdout_reader = BufReader::new(stdout).lines();

    // 处理标准输出
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            if !line.is_empty() {
                let _ = window_clone.emit("deno_install_progress", line);
            }
        }
    });

    let status = child.wait().await?;
    if status.success() {
        println!("Deno 安装成功！");
        if let Ok(new_path) = std::env::var("PATH") {
            std::env::set_var("PATH", new_path);
        }

        // 创建新的运行时实例
        let mut runtime = DENO_RUNTIME.lock().await;
        *runtime = Some(DenoRuntime::new()?);

        Ok(true)
    } else {
        println!("Deno 安装失败");
        Ok(false)
    }
}

/// 检查 Deno 是否已安装
#[tauri::command]
pub async fn deno_check() -> Result<HashMap<String, String>> {
    let runtime = DenoRuntime::new()?;
    let is_installed = runtime.check_installed();

    // 无论是否安装，都更新全局运行时
    let mut global_runtime = DENO_RUNTIME.lock().await;
    *global_runtime = Some(runtime);

    let mut result = HashMap::new();
    result.insert("installed".to_string(), is_installed.to_string());

    if is_installed {
        if let Some((version, path)) = global_runtime.as_ref().unwrap().get_version_and_path() {
            result.insert("version".to_string(), version);
            result.insert("path".to_string(), path);
        }
    }

    Ok(result)
}

/// 执行插件工具
#[tauri::command]
pub async fn plugin_execute(content: String, tool: String, args: Value) -> Result<Value> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.execute(&content, &tool, args).await
}

/// 获取环境变量列表
#[tauri::command]
pub async fn env_list() -> Result<Vec<EnvVar>> {
    let manager = ENV_MANAGER.lock().await;
    let manager = manager
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("环境变量管理器未初始化".to_string()))?;
    manager.load().await
}

/// 保存环境变量
#[tauri::command]
pub async fn env_save(vars: Vec<EnvVar>) -> Result<()> {
    let manager = ENV_MANAGER.lock().await;
    let manager = manager
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("环境变量管理器未初始化".to_string()))?;
    manager.save(&vars).await
}
