pub mod error;
pub mod runtime;
pub mod env;
pub mod plugin;

pub use error::{PluginError, Result};
pub use runtime::DenoRuntime;
pub use env::{EnvVar, EnvManager};
pub use plugin::{Plugin, Tool, PluginWithContent, PluginManager};
use tauri::{Emitter, Runtime, Window, Manager};
use once_cell::sync::Lazy;
use tokio::sync::Mutex;
use tauri::AppHandle;
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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
pub async fn deno_install<R: Runtime>(window: Window<R>) -> Result<bool> {
    println!("[Deno Install] 开始安装 Deno...");
    
    let window_clone = window.clone();
    let (tx, rx) = std::sync::mpsc::channel();
    
    std::thread::spawn(move || {
        let result = (|| {
            let mut cmd = std::process::Command::new("powershell");
            #[cfg(windows)]
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            
            println!("[Deno Install] 准备执行 PowerShell 命令...");
            
            let mut child = match cmd
                .arg("irm")
                .arg("https://deno.land/install.ps1")
                .arg("|")
                .arg("iex")
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn() {
                    Ok(child) => child,
                    Err(e) => {
                        println!("[Deno Install] 启动 PowerShell 失败: {:?}", e);
                        return Err(PluginError::Plugin(format!("启动 PowerShell 失败: {}", e)));
                    }
                };

            println!("[Deno Install] PowerShell 进程已启动，PID: {:?}", child.id());

            let stdout = child.stdout.take().unwrap();
            let stderr = child.stderr.take().unwrap();

            // 创建新线程来读取输出
            let window_clone1 = window_clone.clone();
            let stdout_thread = std::thread::spawn(move || {
                println!("[Deno Install] 开始监听标准输出...");
                let mut reader = BufReader::new(stdout);
                let mut line = String::new();
                while let Ok(n) = reader.read_line(&mut line) {
                    if n == 0 {
                        break;
                    }
                    if !line.is_empty() {
                        println!("[Deno Install] 标准输出: {}", line.trim());
                        if let Err(e) = window_clone1.emit("deno_install_progress", line.trim()) {
                            println!("[Deno Install] 发送进度事件失败: {:?}", e);
                        }
                        line.clear();
                    }
                }
                println!("[Deno Install] 标准输出监听结束");
            });

            // 创建新线程来读取错误输出
            let window_clone2 = window_clone.clone();
            let stderr_thread = std::thread::spawn(move || {
                println!("[Deno Install] 开始监听错误输出...");
                let mut reader = BufReader::new(stderr);
                let mut line = String::new();
                while let Ok(n) = reader.read_line(&mut line) {
                    if n == 0 {
                        break;
                    }
                    if !line.is_empty() {
                        println!("[Deno Install] 错误输出: {}", line.trim());
                        if let Err(e) = window_clone2.emit("deno_install_error", line.trim()) {
                            println!("[Deno Install] 发送错误事件失败: {:?}", e);
                        }
                        line.clear();
                    }
                }
                println!("[Deno Install] 错误输出监听结束");
            });

            println!("[Deno Install] 等待安装进程完成...");
            let status = match child.wait() {
                Ok(status) => status,
                Err(e) => {
                    println!("[Deno Install] 等待进程完成失败: {:?}", e);
                    return Err(PluginError::Plugin(format!("等待进程完成失败: {}", e)));
                }
            };
            println!("[Deno Install] 安装进程退出状态: {:?}", status);

            // 等待输出线程完成
            if let Err(e) = stdout_thread.join() {
                println!("[Deno Install] 标准输出线程异常: {:?}", e);
            }
            if let Err(e) = stderr_thread.join() {
                println!("[Deno Install] 错误输出线程异常: {:?}", e);
            }

            if status.success() {
                println!("[Deno Install] Deno 安装成功！");
                if let Ok(new_path) = std::env::var("PATH") {
                    println!("[Deno Install] 更新 PATH 环境变量...");
                    std::env::set_var("PATH", new_path);
                }
                
                println!("[Deno Install] 创建新的运行时实例...");
                match DenoRuntime::new() {
                    Ok(runtime) => {
                        let mut global_runtime = DENO_RUNTIME.blocking_lock();
                        *global_runtime = Some(runtime);
                        Ok(true)
                    },
                    Err(e) => {
                        println!("[Deno Install] 创建运行时实例失败: {:?}", e);
                        Err(PluginError::Plugin(format!("创建运行时实例失败: {}", e)))
                    }
                }
            } else {
                println!("[Deno Install] Deno 安装失败，退出码: {:?}", status.code());
                Ok(false)
            }
        })();
        
        let _ = tx.send(result);
    });

    rx.recv().unwrap_or(Err(PluginError::Plugin("安装过程发生未预期的错误".to_string())))
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

/// 导入插件
#[tauri::command]
pub async fn plugin_import(content: String) -> Result<Plugin> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.import(content).await
}

/// 获取插件列表
#[tauri::command]
pub async fn plugins_list() -> Result<HashMap<String, Plugin>> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.list().await
}

/// 获取插件
#[tauri::command]
pub async fn plugin_get(id: String) -> Result<Option<PluginWithContent>> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.get(&id).await
}

/// 删除插件
#[tauri::command]
pub async fn plugin_remove(id: String) -> Result<()> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.remove(&id).await
}

/// 更新插件
#[tauri::command]
pub async fn plugin_update(id: String, content: String) -> Result<Plugin> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.update(&id, content).await
}

/// 执行插件工具
#[tauri::command]
pub async fn plugin_execute(id: String, tool: String, args: Value) -> Result<Value> {
    let manager = PLUGIN_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("插件管理器未初始化".to_string()))?;
    manager.execute(&id, &tool, args).await
}

/// 获取环境变量列表
#[tauri::command]
pub async fn env_list() -> Result<Vec<EnvVar>> {
    let manager = ENV_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("环境变量管理器未初始化".to_string()))?;
    manager.load().await
}

/// 保存环境变量
#[tauri::command]
pub async fn env_save(vars: Vec<EnvVar>) -> Result<()> {
    let manager = ENV_MANAGER.lock().await;
    let manager = manager.as_ref().ok_or_else(|| PluginError::Plugin("环境变量管理器未初始化".to_string()))?;
    manager.save(&vars).await
} 