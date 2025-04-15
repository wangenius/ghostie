pub mod env;
pub mod error;
pub mod plugin;
pub mod runtime;

pub use env::{EnvManager, EnvVar};
pub use error::{PluginError, Result};
use once_cell::sync::Lazy;
pub use plugin::{Plugin, PluginManager, PluginWithContent, Tool};
pub use runtime::NodeRuntime;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// 全局状态
static APP_HANDLE: Lazy<Mutex<Option<AppHandle>>> = Lazy::new(|| Mutex::new(None));
static PLUGIN_MANAGER: Lazy<Mutex<Option<PluginManager>>> = Lazy::new(|| Mutex::new(None));
static ENV_MANAGER: Lazy<Mutex<Option<EnvManager>>> = Lazy::new(|| Mutex::new(None));
static NODE_RUNTIME: Lazy<Mutex<Option<NodeRuntime>>> = Lazy::new(|| Mutex::new(None));

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

    let mut runtime = NODE_RUNTIME.lock().await;
    if runtime.is_none() {
        *runtime = Some(NodeRuntime::new()?);
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

/// 安装 Node
#[tauri::command]
pub async fn node_install(window: tauri::Window) -> Result<bool> {
    println!("开始安装 Node...");

    // 检查是否已安装scoop
    let check_scoop = Command::new("powershell")
        .args(&[
            "-Command",
            "if (Get-Command scoop -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }",
        ])
        .status()
        .await;

    // 如果scoop未安装，先安装scoop
    if check_scoop.is_err() || !check_scoop.unwrap().success() {
        let _ = window.emit("node_install_progress", "Scoop未安装，正在安装Scoop...");
        let mut install_scoop = Command::new("powershell")
            .args(&["-Command", "iwr -useb get.scoop.sh | iex"])
            .stdout(std::process::Stdio::piped())
            .spawn()?;

        let status = install_scoop.wait().await?;
        if !status.success() {
            let _ = window.emit("node_install_progress", "Scoop安装失败");
            return Ok(false);
        }
        let _ = window.emit("node_install_progress", "Scoop安装成功");
    }

    // 使用scoop安装nodejs
    let _ = window.emit("node_install_progress", "正在使用Scoop安装Node.js...");

    #[cfg(windows)]
    let mut cmd = Command::new("powershell");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd
        .args(&["-Command", "scoop install nodejs"])
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
                let _ = window_clone.emit("node_install_progress", line);
            }
        }
    });

    let status = child.wait().await?;
    if status.success() {
        println!("Node.js 安装成功！");
        if let Ok(new_path) = std::env::var("PATH") {
            std::env::set_var("PATH", new_path);
        }

        // 创建新的运行时实例
        let mut runtime = NODE_RUNTIME.lock().await;
        *runtime = Some(NodeRuntime::new()?);

        Ok(true)
    } else {
        println!("Node.js 安装失败");
        Ok(false)
    }
}

/// 检查 Node 是否已安装
#[tauri::command]
pub async fn node_check() -> Result<HashMap<String, String>> {
    let runtime = NodeRuntime::new()?;
    let is_installed = runtime.check_installed();

    // 无论是否安装，都更新全局运行时
    let mut global_runtime = NODE_RUNTIME.lock().await;
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

/// 列出已安装的依赖
#[tauri::command]
pub async fn node_list_dependencies() -> Result<HashMap<String, String>> {
    let runtime = NODE_RUNTIME.lock().await;
    let runtime = runtime
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("Node运行时未初始化".to_string()))?;

    if !runtime.check_installed() {
        return Err(PluginError::NodeNotInstalled);
    }

    // 获取插件目录
    let config_dir = crate::utils::file::get_config_dir()
        .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?;
    let plugins_dir = config_dir.join("plugins");

    // 读取package.json文件
    let package_json_path = plugins_dir.join("package.json");
    if !package_json_path.exists() {
        return Ok(HashMap::new());
    }

    let package_json_content = fs::read_to_string(&package_json_path)?;
    let package_json: Value = serde_json::from_str(&package_json_content)?;

    // 提取依赖信息
    let mut dependencies = HashMap::new();

    if let Some(deps) = package_json.get("dependencies").and_then(|v| v.as_object()) {
        for (name, version) in deps {
            dependencies.insert(
                name.clone(),
                version.as_str().unwrap_or("unknown").to_string(),
            );
        }
    }

    if let Some(dev_deps) = package_json
        .get("devDependencies")
        .and_then(|v| v.as_object())
    {
        for (name, version) in dev_deps {
            dependencies.insert(
                name.clone(),
                version.as_str().unwrap_or("unknown").to_string(),
            );
        }
    }

    Ok(dependencies)
}

/// 安装依赖
#[tauri::command]
pub async fn node_install_dependency(
    window: tauri::Window,
    packages: Vec<String>,
    dev: bool,
) -> Result<bool> {
    let runtime = NODE_RUNTIME.lock().await;
    let runtime = runtime
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("Node运行时未初始化".to_string()))?;

    if !runtime.check_installed() {
        return Err(PluginError::NodeNotInstalled);
    }

    // 获取插件目录
    let config_dir = crate::utils::file::get_config_dir()
        .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?;
    let plugins_dir = config_dir.join("plugins");

    if packages.is_empty() {
        return Ok(true);
    }

    #[cfg(windows)]
    let mut cmd = Command::new("cmd");
    #[cfg(not(windows))]
    let mut cmd = Command::new("sh");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        cmd.args(["/C", "npm", "install"]);
    }

    #[cfg(not(windows))]
    {
        cmd.args(["-c", &format!("npm install {}", packages.join(" "))]);
    }

    // 添加依赖包
    #[cfg(windows)]
    {
        for package in &packages {
            cmd.arg(package);
        }
    }

    // 如果是开发依赖，添加 --save-dev 参数
    if dev {
        cmd.arg("--save-dev");
    } else {
        cmd.arg("--save");
    }

    let _ = window.emit("node_dependency_progress", "正在安装依赖...");

    cmd.current_dir(&plugins_dir);
    cmd.stdout(std::process::Stdio::piped());
    let mut child = cmd.spawn()?;

    let stdout = child.stdout.take().unwrap();

    // 创建异步读取器
    let mut stdout_reader = BufReader::new(stdout).lines();

    // 处理标准输出
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            if !line.is_empty() {
                let _ = window_clone.emit("node_dependency_progress", line);
            }
        }
    });

    let status = child.wait().await?;
    if status.success() {
        let message = format!("依赖安装成功: {}", packages.join(", "));
        let _ = window.emit("node_dependency_progress", message);
        Ok(true)
    } else {
        let message = format!("依赖安装失败: {}", packages.join(", "));
        let _ = window.emit("node_dependency_progress", message);
        Ok(false)
    }
}

/// 删除依赖
#[tauri::command]
pub async fn node_uninstall_dependency(
    window: tauri::Window,
    packages: Vec<String>,
) -> Result<bool> {
    let runtime = NODE_RUNTIME.lock().await;
    let runtime = runtime
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("Node运行时未初始化".to_string()))?;

    if !runtime.check_installed() {
        return Err(PluginError::NodeNotInstalled);
    }

    // 获取插件目录
    let config_dir = crate::utils::file::get_config_dir()
        .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?;
    let plugins_dir = config_dir.join("plugins");

    if packages.is_empty() {
        return Ok(true);
    }

    #[cfg(windows)]
    let mut cmd = Command::new("cmd");
    #[cfg(not(windows))]
    let mut cmd = Command::new("sh");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        cmd.args(["/C", "npm", "uninstall"]);
    }

    #[cfg(not(windows))]
    {
        cmd.args(["-c", &format!("npm uninstall {}", packages.join(" "))]);
    }

    // 添加依赖包
    #[cfg(windows)]
    {
        for package in &packages {
            cmd.arg(package);
        }
    }

    let _ = window.emit("node_dependency_progress", "正在删除依赖...");

    cmd.current_dir(&plugins_dir);
    cmd.stdout(std::process::Stdio::piped());
    let mut child = cmd.spawn()?;

    let stdout = child.stdout.take().unwrap();

    // 创建异步读取器
    let mut stdout_reader = BufReader::new(stdout).lines();

    // 处理标准输出
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            if !line.is_empty() {
                let _ = window_clone.emit("node_dependency_progress", line);
            }
        }
    });

    let status = child.wait().await?;
    if status.success() {
        let message = format!("依赖删除成功: {}", packages.join(", "));
        let _ = window.emit("node_dependency_progress", message);
        Ok(true)
    } else {
        let message = format!("依赖删除失败: {}", packages.join(", "));
        let _ = window.emit("node_dependency_progress", message);
        Ok(false)
    }
}

/// 更新所有依赖
#[tauri::command]
pub async fn node_update_dependencies(window: tauri::Window) -> Result<bool> {
    let runtime = NODE_RUNTIME.lock().await;
    let runtime = runtime
        .as_ref()
        .ok_or_else(|| PluginError::Plugin("Node运行时未初始化".to_string()))?;

    if !runtime.check_installed() {
        return Err(PluginError::NodeNotInstalled);
    }

    // 获取插件目录
    let config_dir = crate::utils::file::get_config_dir()
        .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?;
    let plugins_dir = config_dir.join("plugins");

    #[cfg(windows)]
    let mut cmd = Command::new("cmd");
    #[cfg(not(windows))]
    let mut cmd = Command::new("sh");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        cmd.args(["/C", "npm", "update"]);
    }

    #[cfg(not(windows))]
    {
        cmd.args(["-c", "npm update"]);
    }

    let _ = window.emit("node_dependency_progress", "正在更新所有依赖...");

    cmd.current_dir(&plugins_dir);
    cmd.stdout(std::process::Stdio::piped());
    let mut child = cmd.spawn()?;

    let stdout = child.stdout.take().unwrap();

    // 创建异步读取器
    let mut stdout_reader = BufReader::new(stdout).lines();

    // 处理标准输出
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            if !line.is_empty() {
                let _ = window_clone.emit("node_dependency_progress", line);
            }
        }
    });

    let status = child.wait().await?;
    if status.success() {
        let _ = window.emit("node_dependency_progress", "所有依赖更新成功");
        Ok(true)
    } else {
        let _ = window.emit("node_dependency_progress", "依赖更新失败");
        Ok(false)
    }
}
