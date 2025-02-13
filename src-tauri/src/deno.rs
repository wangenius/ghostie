use crate::utils::utils::get_config_dir;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;

lazy_static! {
    static ref DENO_PLUGINS: Mutex<HashMap<String, DenoPlugin>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DenoPlugin {
    pub name: String,
    pub description: String,
    pub script: String,
    pub dependencies: Vec<String>,
    #[serde(skip)]
    pub file_path: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PluginManifest {
    name: String,
    description: String,
    dependencies: Vec<String>,
    file: String, // 相对于插件目录的路径
}

impl DenoPlugin {
    // 从文件加载插件
    fn from_manifest(manifest: &PluginManifest, plugin_dir: &Path) -> Result<Self, String> {
        let file_path = plugin_dir.join(&manifest.file);
        let script =
            fs::read_to_string(&file_path).map_err(|e| format!("读取插件文件失败: {}", e))?;

        Ok(DenoPlugin {
            name: manifest.name.clone(),
            description: manifest.description.clone(),
            script,
            dependencies: manifest.dependencies.clone(),
            file_path: Some(file_path),
        })
    }
}

/* 初始化 Deno 运行时和插件系统 */
pub fn init_deno_runtime() -> Result<(), String> {
    // 检查 Deno 安装
    #[cfg(windows)]
    let deno_exists = {
        // 尝试从多个位置查找 deno
        let home = std::env::var("USERPROFILE").unwrap_or_default();
        let deno_exe = format!("{}/.deno/bin/deno.exe", home);
        let deno_path = if std::path::Path::new(&deno_exe).exists() {
            deno_exe
        } else {
            "deno".to_string()
        };

        Command::new(&deno_path)
            .arg("--version")
            .env("PATH", get_system_path())
            .output()
            .is_ok()
    };

    if !deno_exists {
        return Err("Deno 未安装，请确保已安装 Deno 并添加到系统环境变量中".to_string());
    }

    // 加载所有插件
    load_all_plugins()?;
    Ok(())
}

/* 加载所有插件 */
fn load_all_plugins() -> Result<(), String> {
    let config_dir = get_config_dir().ok_or("无法获取配置目录")?;
    let plugin_dir = config_dir.join("plugins");

    if !plugin_dir.exists() {
        fs::create_dir_all(&plugin_dir).map_err(|e| format!("创建插件目录失败: {}", e))?;
        return Ok(());
    }

    // 读取插件清单文件
    let manifest_path = plugin_dir.join("plugins.toml");
    if !manifest_path.exists() {
        return Ok(());
    }

    let manifest_content =
        fs::read_to_string(&manifest_path).map_err(|e| format!("读取插件清单失败: {}", e))?;
    let manifests: Vec<PluginManifest> =
        toml::from_str(&manifest_content).map_err(|e| format!("解析插件清单失败: {}", e))?;

    let mut plugins = DENO_PLUGINS.lock().unwrap();
    plugins.clear();

    // 加载每个插件
    for manifest in manifests {
        match DenoPlugin::from_manifest(&manifest, &plugin_dir) {
            Ok(plugin) => {
                println!("加载插件: {} 从 {}", plugin.name, manifest.file);
                plugins.insert(plugin.name.clone(), plugin);
            }
            Err(e) => {
                println!("加载插件失败 {}: {}", manifest.name, e);
            }
        }
    }

    println!("已加载 {} 个插件", plugins.len());
    Ok(())
}

// 保存插件清单到 TOML 文件
fn save_plugin_manifests() -> Result<(), String> {
    let config_dir = get_config_dir().ok_or("无法获取配置目录")?;
    let plugin_dir = config_dir.join("plugins");
    let manifest_path = plugin_dir.join("plugins.toml");

    let plugins = DENO_PLUGINS.lock().unwrap();
    let manifests: Vec<PluginManifest> = plugins
        .values()
        .filter_map(|plugin| {
            plugin.file_path.as_ref().map(|path| {
                let file = path.strip_prefix(&plugin_dir).ok()?.to_str()?.to_string();
                Some(PluginManifest {
                    name: plugin.name.clone(),
                    description: plugin.description.clone(),
                    dependencies: plugin.dependencies.clone(),
                    file,
                })
            })?
        })
        .collect();

    let toml_content =
        toml::to_string_pretty(&manifests).map_err(|e| format!("序列化插件清单失败: {}", e))?;
    fs::write(&manifest_path, toml_content).map_err(|e| format!("保存插件清单失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn register_deno_plugin_from_ts(
    _app: tauri::AppHandle,
    content: String,
) -> Result<serde_json::Value, String> {
    let config_dir = get_config_dir().ok_or("无法获取配置目录")?;
    let plugin_dir = config_dir.join("plugins");

    // 创建临时文件来解析插件信息
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("temp_plugin.ts");
    fs::write(&temp_file, &content).map_err(|e| format!("写入临时文件失败: {}", e))?;

    // 解析插件信息
    let plugin_info = parse_plugin_info(&temp_file)?;
    let _ = fs::remove_file(&temp_file);

    // 创建正式的插件文件
    let file_name = format!("{}.ts", plugin_info["name"].as_str().unwrap_or("unknown"));
    let plugin_file = plugin_dir.join(&file_name);
    fs::write(&plugin_file, content.clone()).map_err(|e| format!("保存插件失败: {}", e))?;

    // 创建插件对象
    let plugin = DenoPlugin {
        name: plugin_info["name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string(),
        description: plugin_info["description"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        script: content.clone(),
        dependencies: vec![],
        file_path: Some(plugin_file),
    };

    // 注册插件
    let mut plugins = DENO_PLUGINS.lock().unwrap();
    plugins.insert(plugin.name.clone(), plugin);

    // 保存清单
    save_plugin_manifests()?;

    Ok(plugin_info)
}

#[tauri::command]
pub async fn register_deno_plugin(plugin: DenoPlugin) -> Result<(), String> {
    let mut plugins = DENO_PLUGINS.lock().unwrap();
    plugins.insert(plugin.name.clone(), plugin);
    Ok(())
}

#[tauri::command]
pub async fn execute_deno_plugin(
    name: String,
    args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let plugins = DENO_PLUGINS.lock().unwrap();

    if let Some(plugin) = plugins.get(&name) {
        let script_path = if let Some(path) = &plugin.file_path {
            path.clone()
        } else {
            return Err("插件文件路径未知".to_string());
        };

        // 执行 Deno 脚本
        let output = Command::new(get_deno_path())
            .arg("run")
            .arg("--allow-net")
            .arg("--allow-read")
            .arg("--allow-write")
            .arg(script_path)
            .arg(args.to_string())
            .env("PATH", get_system_path())
            .output()
            .map_err(|e| format!("执行插件失败: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "插件执行失败: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let result =
            String::from_utf8(output.stdout).map_err(|e| format!("解析输出失败: {}", e))?;

        serde_json::from_str(&result).map_err(|e| format!("解析 JSON 结果失败: {}", e))
    } else {
        Err(format!("插件 {} 未找到", name))
    }
}

#[tauri::command]
pub async fn list_deno_plugins() -> Result<Vec<DenoPlugin>, String> {
    let plugins = DENO_PLUGINS.lock().unwrap();
    Ok(plugins.values().cloned().collect())
}

#[tauri::command]
pub async fn remove_deno_plugin(name: String) -> Result<(), String> {
    let mut plugins = DENO_PLUGINS.lock().unwrap();

    if let Some(plugin) = plugins.remove(&name) {
        // 删除插件文件
        if let Some(path) = plugin.file_path {
            if let Err(e) = fs::remove_file(path) {
                println!("删除插件文件失败: {}", e);
            }
        }
        // 更新清单
        save_plugin_manifests()?;
    }

    Ok(())
}

// 获取系统 PATH 环境变量
fn get_system_path() -> String {
    let mut paths = Vec::new();

    // 添加用户 HOME 目录下的 .deno/bin
    if let Ok(home) = std::env::var("USERPROFILE") {
        paths.push(format!("{}/.deno/bin", home));
    }

    // 获取系统 PATH
    if let Ok(path) = std::env::var("PATH") {
        paths.push(path);
    }

    paths.join(";")
}

// 获取 deno 可执行文件路径
fn get_deno_path() -> String {
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    let deno_exe = format!("{}/.deno/bin/deno.exe", home);
    if std::path::Path::new(&deno_exe).exists() {
        deno_exe
    } else {
        "deno".to_string()
    }
}

// 辅助函数：解析插件信息
fn parse_plugin_info(path: &Path) -> Result<serde_json::Value, String> {
    // 执行 Deno 脚本获取插件信息
    let wrapper_content = format!(
        r#"
        const mod = await import('file://{}');
        const plugin = mod.default;
        console.log(JSON.stringify({{
            name: plugin.name,
            description: plugin.description,
            functions: plugin.functions
        }}));
        "#,
        path.to_string_lossy().replace('\\', "/")
    );

    let temp_dir = std::env::temp_dir();
    let wrapper_file = temp_dir.join("wrapper.ts");
    fs::write(&wrapper_file, wrapper_content).map_err(|e| format!("写入包装脚本失败: {}", e))?;

    let output = Command::new(get_deno_path())
        .arg("run")
        .arg("--allow-read")
        .arg("--allow-net")
        .arg("--allow-env")
        .arg("--allow-sys")
        .arg(&wrapper_file)
        .env("PATH", get_system_path())
        .output()
        .map_err(|e| format!("执行 Deno 脚本失败: {}", e))?;

    let _ = fs::remove_file(wrapper_file);

    if !output.status.success() {
        return Err(format!(
            "插件执行失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let result = String::from_utf8(output.stdout).map_err(|e| format!("解析输出失败: {}", e))?;
    let plugin_info: serde_json::Value =
        serde_json::from_str(&result.trim()).map_err(|e| format!("解析插件信息失败: {}", e))?;

    Ok(plugin_info)
}
