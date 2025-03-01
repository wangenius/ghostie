use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex as StdMutex;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use thiserror::Error;
use tokio::sync::Mutex;
use toml;

use crate::utils::file::get_config_dir;
use crate::utils::gen::generate_id;

// 全局 AppHandle 状态
static APP_HANDLE: Lazy<StdMutex<Option<AppHandle>>> = Lazy::new(|| StdMutex::new(None));

// 设置 AppHandle 的函数
pub fn set_app_handle(handle: AppHandle) {
    let mut app_handle = APP_HANDLE.lock().unwrap();
    *app_handle = Some(handle);
}

// 获取 AppHandle 的函数
fn get_app_handle() -> Option<AppHandle> {
    APP_HANDLE.lock().unwrap().clone()
}

// 定义错误类型
#[derive(Error, Debug, Serialize)]
pub enum PluginError {
    #[error("IO错误: {0}")]
    Io(String),
    #[error("JSON错误: {0}")]
    Json(String),
    #[error("TOML错误: {0}")]
    Toml(String),
    #[error("插件错误: {0}")]
    Plugin(String),
}

impl From<std::io::Error> for PluginError {
    fn from(err: std::io::Error) -> Self {
        PluginError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for PluginError {
    fn from(err: serde_json::Error) -> Self {
        PluginError::Json(err.to_string())
    }
}

impl From<toml::ser::Error> for PluginError {
    fn from(err: toml::ser::Error) -> Self {
        PluginError::Toml(err.to_string())
    }
}

impl From<toml::de::Error> for PluginError {
    fn from(err: toml::de::Error) -> Self {
        PluginError::Toml(err.to_string())
    }
}

impl From<String> for PluginError {
    fn from(err: String) -> Self {
        PluginError::Plugin(err)
    }
}

impl<'a> From<&'a str> for PluginError {
    fn from(err: &'a str) -> Self {
        PluginError::Plugin(err.to_string())
    }
}

type Result<T> = std::result::Result<T, PluginError>;

// 插件信息结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tools: Vec<Tool>,
}

// 工具信息结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: Option<Value>,
}

// 在文件开头的其他结构体定义附近添加
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginWithContent {
    pub info: Plugin,
    pub content: String,
}

// 在其他结构体定义附近添加
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

// 使用 Lazy 静态变量缓存插件目录和 Deno 运行时配置
static PLUGINS_DIR: Lazy<PathBuf> = Lazy::new(|| {
    let mut config_dir = get_config_dir().expect("无法获取配置目录");
    config_dir.push("plugins");
    fs::create_dir_all(&config_dir).expect("无法创建插件目录");
    config_dir
});

/// Deno 运行时
static DENO_RUNTIME: Lazy<DenoRuntime> =
    Lazy::new(|| DenoRuntime::new().expect("无法初始化 Deno 运行时"));

// 缓存插件列表
static PLUGIN_CACHE: Lazy<Mutex<Option<HashMap<String, Plugin>>>> = Lazy::new(|| Mutex::new(None));

// Deno 运行时封装
struct DenoRuntime {
    is_installed: bool,
    base_args: Vec<String>,
}

// 运行时实现
impl DenoRuntime {
    // 运行时初始化
    fn new() -> std::io::Result<Self> {
        // 首先尝试直接运行 deno 命令
        let is_installed = Command::new("deno").arg("--version").output().is_ok();
        println!("直接运行 deno 命令结果: {}", is_installed);

        if is_installed {
            return Ok(Self {
                is_installed: true,
                base_args: vec![
                    "run".to_string(),
                    "--no-check".to_string(),
                    "--allow-read".to_string(),
                    "--allow-write".to_string(),
                    "--allow-net".to_string(),
                    "--allow-env".to_string(),
                    "--allow-run".to_string(),
                ],
            });
        }

        // 获取系统 PATH 环境变量中的所有路径
        let path_var = std::env::var("PATH").unwrap_or_default();
        println!("系统 PATH: {}", path_var);
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
        println!("用户目录: {}", user_profile);

        // 构建可能的 Deno 路径列表
        let mut deno_paths = vec![
            String::from("deno.exe"),
            String::from(r"C:\Program Files\deno\deno.exe"),
            String::from(r"C:\ProgramData\chocolatey\bin\deno.exe"),
            format!("{}/.deno/bin/deno.exe", user_profile),
        ];

        // 将 PATH 中的每个目录都加入搜索列表
        for path in path_var.split(';') {
            let deno_path = format!("{}/deno.exe", path.trim());
            println!("检查路径: {}", deno_path);
            deno_paths.push(deno_path);
        }

        // 检查所有可能的路径
        let is_found = deno_paths.iter().any(|path| {
            let result = Command::new(path).arg("--version").output().is_ok();
            println!("尝试路径 {}: {}", path, result);
            result
        });

        println!("最终检测结果: {}", is_found);

        // 如果没有找到 Deno，尝试安装
        if !is_found {
            println!("Deno 未安装，开始安装...");
            // 使用 PowerShell 执行安装脚本
            let install_result = Command::new("powershell")
                .arg("-ExecutionPolicy")
                .arg("Bypass")
                .arg("-File")
                .arg("scripts/install-deno.ps1")
                .output();

            match install_result {
                Ok(output) => {
                    if output.status.success() {
                        println!("Deno 安装成功！");
                        // 刷新 PATH 环境变量
                        if let Ok(new_path) = std::env::var("PATH") {
                            std::env::set_var("PATH", new_path);
                        }
                        return Ok(Self {
                            is_installed: true,
                            base_args: vec![
                                "run".to_string(),
                                "--no-check".to_string(),
                                "--allow-read".to_string(),
                                "--allow-write".to_string(),
                                "--allow-net".to_string(),
                                "--allow-env".to_string(),
                                "--allow-run".to_string(),
                            ],
                        });
                    } else {
                        let error_msg = String::from_utf8_lossy(&output.stderr);
                        println!("Deno 安装失败: {}", error_msg);

                        // 使用全局 AppHandle 发送通知
                        if let Some(app_handle) = get_app_handle() {
                            let _ = app_handle
                                .notification()
                                .builder()
                                .title("Deno 安装失败")
                                .body(&format!("安装过程中出现错误：{}", error_msg))
                                .icon("error")
                                .show();
                        }
                    }
                }
                Err(e) => {
                    println!("执行安装脚本失败: {}", e);

                    // 使用全局 AppHandle 发送通知
                    if let Some(app_handle) = get_app_handle() {
                        let _ = app_handle
                            .notification()
                            .builder()
                            .title("Deno 安装失败")
                            .body(&format!("无法执行安装脚本：{}", e))
                            .icon("error")
                            .show();
                    }
                }
            }
        }

        Ok(Self {
            is_installed: is_found,
            base_args: vec![
                "run".to_string(),
                "--no-check".to_string(),
                "--allow-read".to_string(),
                "--allow-write".to_string(),
                "--allow-net".to_string(),
                "--allow-env".to_string(),
                "--allow-run".to_string(),
            ],
        })
    }

    // 执行插件
    async fn execute(&self, script: &str, env_vars: &[EnvVar]) -> std::io::Result<String> {
        if !self.is_installed {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Deno 未安装，请先安装 Deno: https://deno.land/#installation",
            ));
        }

        // 临时文件
        let temp_file = PLUGINS_DIR.join("temp.ts");
        fs::write(&temp_file, script)?;
        // cmd
        let mut cmd = Command::new("deno");
        cmd.args(&self.base_args).arg(&temp_file);

        for var in env_vars {
            cmd.env(&var.key, &var.value);
        }

        let output = cmd.output()?;
        fs::remove_file(temp_file)?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }
}

async fn load_env_vars() -> Result<Vec<EnvVar>> {
    let path = PLUGINS_DIR.join(".env");
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path)?;
    Ok(content
        .lines()
        .filter(|line| !line.trim().is_empty() && !line.starts_with('#'))
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            if parts.len() == 2 {
                Some(EnvVar {
                    key: parts[0].trim().to_string(),
                    value: parts[1].trim().to_string(),
                })
            } else {
                None
            }
        })
        .collect())
}

async fn load_plugin_list() -> Result<HashMap<String, Plugin>> {
    let mut cache = PLUGIN_CACHE.lock().await;
    if let Some(ref cached) = *cache {
        return Ok(cached.clone());
    }

    let path = PLUGINS_DIR.join("list.toml");
    if !path.exists() {
        let empty_map = HashMap::new();
        *cache = Some(empty_map.clone());
        return Ok(empty_map);
    }

    let content = fs::read_to_string(path)?;
    let plugins: HashMap<String, Plugin> = toml::from_str(&content)?;
    *cache = Some(plugins.clone());
    Ok(plugins)
}

async fn save_plugin_list(plugins: &HashMap<String, Plugin>) -> Result<()> {
    let content = toml::to_string(plugins)?;
    fs::write(PLUGINS_DIR.join("list.toml"), content)?;

    let mut cache = PLUGIN_CACHE.lock().await;
    *cache = Some(plugins.clone());
    Ok(())
}

// 处理插件内容
async fn process_plugin_content(id: String, content: String) -> Result<Plugin> {
    let plugin_file = PLUGINS_DIR.join(format!("{}.ts", id));
    fs::write(&plugin_file, &content)?;

    let script = format!(
        r#"
        const plugin = await import('file://{plugin_path}');
        const tools = Object.entries(plugin.default.tools || {{}})
            .map(([key, value]) => {{
                const res = {{
                    name: key || "undefined",
                    description: value.description || "",
                }};
                if (value.parameters) {{
                   res.parameters = value.parameters;
                }}
                return res;
            }});
        console.log(JSON.stringify({{
            name: plugin.default.name || "undefined",
            description: plugin.default.description || "",
            tools
        }}));
        "#,
        plugin_path = plugin_file.to_string_lossy().replace('\\', "/")
    );

    let env_vars = load_env_vars().await?;
    let output = DENO_RUNTIME.execute(&script, &env_vars).await?;
    let plugin_info: Value = serde_json::from_str(&output)?;

    let tools = plugin_info["tools"]
        .as_array()
        .ok_or_else(|| PluginError::Plugin("tools 字段无效".to_string()))?
        .iter()
        .map(|tool| {
            let name = tool["name"]
                .as_str()
                .ok_or_else(|| PluginError::Plugin("tool name 字段无效".to_string()))?
                .to_string();
            let description = tool["description"]
                .as_str()
                .ok_or_else(|| PluginError::Plugin("tool description 字段无效".to_string()))?
                .to_string();
            Ok(Tool {
                name,
                description,
                parameters: if tool.get("parameters").is_some() {
                    Some(tool["parameters"].clone())
                } else {
                    None
                },
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let plugin = Plugin {
        id: id.clone(),
        name: plugin_info["name"]
            .as_str()
            .ok_or_else(|| PluginError::Plugin("name 字段无效".to_string()))?
            .to_string(),
        description: plugin_info["description"].as_str().map(|s| s.to_string()),
        tools,
    };

    let mut plugins = load_plugin_list().await?;
    plugins.insert(id, plugin.clone());
    save_plugin_list(&plugins).await?;

    Ok(plugin)
}

#[tauri::command]
pub async fn plugin_import(content: String) -> Result<Plugin> {
    let id = generate_id();
    process_plugin_content(id, content).await
}

#[tauri::command]
pub async fn plugins_list() -> Result<HashMap<String, Plugin>> {
    load_plugin_list().await
}

#[tauri::command]
pub async fn plugin_get(id: String) -> Result<Option<PluginWithContent>> {
    let plugins = load_plugin_list().await?;

    Ok(if let Some(plugin) = plugins.get(&id) {
        let plugin_file = PLUGINS_DIR.join(format!("{}.ts", id));
        let content = fs::read_to_string(plugin_file)?;
        Some(PluginWithContent {
            info: plugin.clone(),
            content,
        })
    } else {
        None
    })
}

#[tauri::command]
pub async fn plugin_remove(id: String) -> Result<()> {
    let mut plugins = load_plugin_list().await?;
    plugins.remove(&id);
    save_plugin_list(&plugins).await?;

    let plugin_path = PLUGINS_DIR.join(format!("{}.ts", id));
    if plugin_path.exists() {
        fs::remove_file(plugin_path)?;
    }

    Ok(())
}

/// 执行指定插件的工具函数
///
/// # 参数
/// * `id` - 插件的唯一标识符
/// * `tool` - 要执行的工具函数名称
/// * `args` - 传递给工具函数的参数，使用JSON Value格式
///
/// # 返回值
/// * `Result<Value>` - 成功时返回工具函数的执行结果，失败时返回错误信息
///
/// # 错误
/// * 当插件文件不存在时返回 `PluginError::Plugin`
/// * 当JSON解析失败时返回 `PluginError::Json`
#[tauri::command]
pub async fn plugin_execute(id: String, tool: String, args: Value) -> Result<Value> {
    /* 插件文件 */
    let plugin_file = PLUGINS_DIR.join(format!("{}.ts", id));
    /* 如果插件不存在则返回插件文件不存在的错误. */
    if !plugin_file.exists() {
        return Err(PluginError::Plugin(format!("插件文件不存在: {}", id)));
    }

    /* 执行脚本 */
    let script = format!(
        r#"
        const plugin = await import('file://{plugin_path}');
        const targetFunction = plugin.default.tools['{tool}'];
        if (!targetFunction) {{
            throw new Error('未知函数: {tool}');
        }}
        const result = await targetFunction.handler({args});
        console.log(JSON.stringify(result));
        "#,
        plugin_path = plugin_file.to_string_lossy().replace('\\', "/"),
        tool = tool,
        args = serde_json::to_string(&args)?
    );

    /* 环境变量加载 */
    let env_vars = load_env_vars().await?;
    let output = DENO_RUNTIME.execute(&script, &env_vars).await?;
    serde_json::from_str(&output).map_err(|e| PluginError::Json(e.to_string()))
}

#[tauri::command]
pub async fn plugin_update(id: String, content: String) -> Result<Plugin> {
    let plugins = load_plugin_list().await?;
    if !plugins.contains_key(&id) {
        return Err(PluginError::Plugin(format!("插件不存在: {}", id)));
    }
    process_plugin_content(id, content).await
}

#[tauri::command]
pub async fn env_list() -> Result<Vec<EnvVar>> {
    load_env_vars().await
}

#[tauri::command]
pub async fn env_save(vars: Vec<EnvVar>) -> Result<()> {
    let content = vars
        .iter()
        .map(|var| format!("{}={}", var.key, var.value))
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(PLUGINS_DIR.join(".env"), content)?;
    Ok(())
}
