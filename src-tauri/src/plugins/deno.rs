use rand::{thread_rng, Rng};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use toml;

use crate::utils::utils::get_config_dir;

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
    pub parameters: Value,
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

// 获取插件目录
fn get_plugins_dir() -> PathBuf {
    let mut config_dir = get_config_dir().expect("无法获取配置目录");
    config_dir.push("plugins");
    fs::create_dir_all(&config_dir).expect("无法创建插件目录");
    config_dir
}

// 检查 deno 是否已安装
fn check_deno_installed() -> bool {
    Command::new("deno").arg("--version").output().is_ok()
}

// 在 execute_deno_script 函数之前添加
fn get_env_file_path() -> PathBuf {
    let mut plugins_dir = get_plugins_dir();
    plugins_dir.push(".env");
    plugins_dir
}

fn load_env_vars() -> Result<Vec<EnvVar>, String> {
    let path = get_env_file_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("读取环境变量失败: {}", e))?;
    let vars: Vec<EnvVar> = content
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
        .collect();

    Ok(vars)
}

// 修改 execute_deno_script 函数，添加环境变量支持
async fn execute_deno_script(script: &str, args: Option<&str>) -> Result<String, String> {
    if !check_deno_installed() {
        return Err("Deno 未安装，请先安装 Deno: https://deno.land/#installation".to_string());
    }

    let mut temp_file = get_plugins_dir();
    temp_file.push("temp.ts");
    fs::write(&temp_file, script).map_err(|e| e.to_string())?;

    // 加载环境变量
    let env_vars = load_env_vars()?;

    let mut cmd = Command::new("deno");
    cmd.arg("run")
        .arg("--no-check")
        .arg("--allow-read")
        .arg("--allow-write")
        .arg("--allow-net")
        .arg("--allow-env")
        .arg("--allow-run")
        .arg(&temp_file);

    // 添加环境变量到命令
    for var in env_vars {
        cmd.env(var.key, var.value);
    }

    if let Some(args) = args {
        cmd.arg(args);
    }

    let output = cmd.output().map_err(|e| e.to_string())?;
    fs::remove_file(temp_file).map_err(|e| e.to_string())?;

    if output.status.success() {
        String::from_utf8(output.stdout).map_err(|e| e.to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// 添加生成ID的函数
fn generate_id() -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let mut rng = thread_rng();
    let mut id = String::with_capacity(16);

    // 生成基于时间戳的前8位
    for i in 0..8 {
        let time_byte = ((timestamp >> (i * 4)) ^ (timestamp >> (i * 2))) & 0x3f;
        let idx = time_byte as usize % CHARS.len();
        id.push(CHARS[idx] as char);
    }

    // 生成随机的后8位
    for _ in 0..8 {
        let idx = rng.gen::<usize>() % CHARS.len();
        id.push(CHARS[idx] as char);
    }

    id
}

// 添加新的函数来处理插件列表文件
fn get_plugin_list_path() -> PathBuf {
    let mut plugins_dir = get_plugins_dir();
    plugins_dir.push("list.toml");
    plugins_dir
}

fn load_plugin_list() -> Result<HashMap<String, Plugin>, String> {
    let path = get_plugin_list_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("读取插件列表失败: {}", e))?;

    toml::from_str(&content).map_err(|e| format!("解析插件列表失败: {}", e))
}

fn save_plugin_list(plugins: &HashMap<String, Plugin>) -> Result<(), String> {
    let path = get_plugin_list_path();
    let content = toml::to_string(plugins).map_err(|e| format!("序列化插件列表失败: {}", e))?;

    fs::write(path, content).map_err(|e| format!("保存插件列表失败: {}", e))
}

// 修改 plugin_import 函数
#[tauri::command]
pub async fn plugin_import(content: String) -> Result<Plugin, String> {
    let id = generate_id();

    /* 保存插件内容到文件 */
    let plugin_file = get_plugins_dir().join(format!("{}.ts", id));
    fs::write(&plugin_file, &content).map_err(|e| e.to_string())?;

    /* 执行脚本获取插件信息 */
    let wrapper_script = format!(
        r#"
        // 导入插件
        const plugin = await import('file://{plugin_path}');
        
        // 获取插件信息
        const tools = Object.entries(plugin.default.tools || {{}}).map(([key, value]) => {{
            return {{
                name: key || "undefined",
                description: value.description || "",
                parameters: value.parameters
            }};
        }});
        
        console.log(JSON.stringify({{
            name: plugin.default.name || "undefined",
            description: plugin.default.description || "",
            tools: tools
        }}));
        "#,
        plugin_path = plugin_file.to_string_lossy().replace('\\', "/")
    );

    let output = execute_deno_script(&wrapper_script, None).await?;

    let plugin_info: Value = serde_json::from_str(&output).map_err(|e| e.to_string())?;

    // 构造插件对象
    let tools = plugin_info["tools"]
        .as_array()
        .ok_or("插件格式错误：tools 不是数组")?
        .iter()
        .map(|tool| {
            Ok(Tool {
                name: tool["name"]
                    .as_str()
                    .ok_or("插件格式错误：name 不是字符串")?
                    .to_string(),
                description: tool["description"]
                    .as_str()
                    .ok_or("插件格式错误：description 不是字符串")?
                    .to_string(),
                parameters: tool["parameters"].clone(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    let plugin = Plugin {
        id: id.clone(),
        name: plugin_info["name"]
            .as_str()
            .ok_or("插件格式错误：name 不是字符串")?
            .to_string(),
        description: plugin_info["description"].as_str().map(|s| s.to_string()),
        tools,
    };

    // 保存插件信息到列表文件
    let mut plugins = load_plugin_list()?;
    plugins.insert(plugin.id.clone(), plugin.clone());
    save_plugin_list(&plugins)?;
    Ok(plugin)
}

// 修改 plugins_list 函数
#[tauri::command]
pub async fn plugins_list() -> Result<HashMap<String, Plugin>, String> {
    load_plugin_list()
}

// 修改 plugin_get 函数
#[tauri::command]
pub async fn plugin_get(id: String) -> Result<Option<PluginWithContent>, String> {
    let plugins = load_plugin_list()?;

    if let Some(plugin) = plugins.get(&id) {
        let plugin_file = get_plugins_dir().join(format!("{}.ts", id));
        let content =
            fs::read_to_string(plugin_file).map_err(|e| format!("读取插件文件失败: {}", e))?;

        Ok(Some(PluginWithContent {
            info: plugin.clone(),
            content,
        }))
    } else {
        Ok(None)
    }
}

// 修改 plugin_remove 函数
#[tauri::command]
pub async fn plugin_remove(id: String) -> Result<(), String> {
    let mut plugins = load_plugin_list()?;
    plugins.remove(&id);
    save_plugin_list(&plugins)?;

    let plugin_path = get_plugins_dir().join(format!("{}.ts", id));

    if plugin_path.exists() {
        fs::remove_file(plugin_path).map_err(|e| format!("删除插件脚本失败: {}", e))?;
    }

    Ok(())
}

// 执行插件
#[tauri::command]
pub async fn plugin_execute(id: String, tool: String, args: Value) -> Result<Value, String> {
    let plugin_file = get_plugins_dir().join(format!("{}.ts", id));
    if !plugin_file.exists() {
        return Err(format!("插件文件不存在: {}", id));
    }

    // 修改执行脚本的格式
    let wrapper_script = format!(
        r#"
        // 导入插件
        const plugin = await import('file://{plugin_path}');
        
        // 检查函数是否存在
        const targetFunction = plugin.default.tools['{tool}'];
        if (!targetFunction) {{
            throw new Error('找不到指定的函数: {tool}');
        }}
        
        // 执行函数
        const result = await targetFunction.handler({args});
        console.log(JSON.stringify(result));
        "#,
        plugin_path = plugin_file.to_string_lossy().replace('\\', "/"),
        tool = tool,
        args = serde_json::to_string(&args).map_err(|e| e.to_string())?
    );

    let output = execute_deno_script(&wrapper_script, None).await?;

    let result: Value = serde_json::from_str(&output).map_err(|e| e.to_string())?;

    Ok(result)
}

// 修改 init 函数
pub async fn init() -> Result<(), String> {
    if !check_deno_installed() {
        return Err("Deno 未安装，请先安装 Deno: https://deno.land/#installation".to_string());
    }
    Ok(())
}

// 添加 plugin_update 命令
#[tauri::command]
pub async fn plugin_update(id: String, content: String) -> Result<Plugin, String> {
    // 检查插件是否存在
    let plugins = load_plugin_list()?;
    if !plugins.contains_key(&id) {
        return Err(format!("插件不存在: {}", id));
    }

    // 保存插件内容到文件
    let plugin_file = get_plugins_dir().join(format!("{}.ts", id));
    fs::write(&plugin_file, &content).map_err(|e| e.to_string())?;

    // 执行脚本获取更新后的插件信息
    let wrapper_script = format!(
        r#"
        // 导入插件
        const plugin = await import('file://{plugin_path}');
        
        // 获取插件信息
        const tools = Object.entries(plugin.default.tools || {{}}).map(([key, value]) => {{
            return {{
                name: key || "undefined",
                description: value.description || "",
                parameters: value.parameters
            }};
        }});
        
        console.log(JSON.stringify({{
            name: plugin.default.name || "undefined",
            description: plugin.default.description || "",
            tools: tools
        }}));
        "#,
        plugin_path = plugin_file.to_string_lossy().replace('\\', "/")
    );

    let output = execute_deno_script(&wrapper_script, None).await?;

    let plugin_info: Value = serde_json::from_str(&output).map_err(|e| e.to_string())?;

    // 构造更新后的插件对象
    let tools = plugin_info["tools"]
        .as_array()
        .ok_or("插件格式错误：tools 不是数组")?
        .iter()
        .map(|tool| {
            Ok(Tool {
                name: tool["name"]
                    .as_str()
                    .ok_or("插件格式错误：name 不是字符串")?
                    .to_string(),
                description: tool["description"]
                    .as_str()
                    .ok_or("插件格式错误：description 不是字符串")?
                    .to_string(),
                parameters: tool["parameters"].clone(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    let updated_plugin = Plugin {
        id: id.clone(),
        name: plugin_info["name"]
            .as_str()
            .ok_or("插件格式错误：name 不是字符串")?
            .to_string(),
        description: plugin_info["description"].as_str().map(|s| s.to_string()),
        tools,
    };

    // 更新插件列表
    let mut plugins = load_plugin_list()?;
    plugins.insert(id, updated_plugin.clone());
    save_plugin_list(&plugins)?;

    Ok(updated_plugin)
}

#[tauri::command]
pub async fn env_list() -> Result<Vec<EnvVar>, String> {
    load_env_vars()
}

#[tauri::command]
pub async fn env_save(vars: Vec<EnvVar>) -> Result<(), String> {
    let content = vars
        .iter()
        .map(|var| format!("{}={}", var.key, var.value))
        .collect::<Vec<_>>()
        .join("\n");

    let path = get_env_file_path();
    fs::write(path, content).map_err(|e| format!("保存环境变量失败: {}", e))
}
