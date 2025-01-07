use std::collections::HashMap;
use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;
use tokio::process::Command;
use crate::llm::agents::types::Tool;

/// 工具处理器接口
#[async_trait]
pub trait ToolHandler: Send + Sync {
    /// 执行工具
    async fn execute(&self, parameters: Value) -> Result<Value>;
}

/// 工具注册器
pub struct ToolRegistry {
    handlers: HashMap<String, Box<dyn ToolHandler>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }
    
    /// 注册工具处理器
    pub fn register<H>(&mut self, name: &str, handler: H)
    where
        H: ToolHandler + 'static,
    {
        self.handlers.insert(name.to_string(), Box::new(handler));
    }
    
    /// 执行工具
    pub async fn execute(&self, tool: &Tool, parameters: Value) -> Result<Value> {
        let handler = self.handlers
            .get(&tool.name)
            .ok_or_else(|| anyhow::anyhow!("Tool not found: {}", tool.name))?;
            
        handler.execute(parameters).await
    }
}

/// 命令行工具处理器
pub struct CommandToolHandler {
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: Option<String>,
}

impl CommandToolHandler {
    pub fn new(command: String, args: Vec<String>, working_dir: Option<String>) -> Self {
        Self {
            command,
            args,
            working_dir,
        }
    }
}

#[async_trait]
impl ToolHandler for CommandToolHandler {
    async fn execute(&self, parameters: Value) -> Result<Value> {
        // 构建命令
        let mut cmd = Command::new(&self.command);
        
        // 添加基础参数
        cmd.args(&self.args);
        
        // 如果参数是对象，将其转换为命令行参数
        if let Some(obj) = parameters.as_object() {
            for (key, value) in obj {
                if let Some(value_str) = value.as_str() {
                    cmd.arg(format!("--{}", key));
                    cmd.arg(value_str);
                }
            }
        }
        
        // 设置工作目录
        if let Some(dir) = &self.working_dir {
            cmd.current_dir(dir);
        }
        
        // 执行命令
        let output = cmd.output().await?;
        
        // 处理输出
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(Value::String(stdout.to_string()))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(anyhow::anyhow!("Command failed: {}", stderr))
        }
    }
}

/// HTTP工具处理器
pub struct HttpToolHandler {
    pub client: reqwest::Client,
    pub base_url: String,
    pub headers: HashMap<String, String>,
}

impl HttpToolHandler {
    pub fn new(base_url: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url,
            headers: HashMap::new(),
        }
    }
    
    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }
}

#[async_trait]
impl ToolHandler for HttpToolHandler {
    async fn execute(&self, parameters: Value) -> Result<Value> {
        let method = parameters
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET");
            
        let path = parameters
            .get("path")
            .and_then(|v| v.as_str())
            .unwrap_or("");
            
        let url = format!("{}{}", self.base_url, path);
        
        // 构建请求
        let mut request = match method.to_uppercase().as_str() {
            "GET" => self.client.get(&url),
            "POST" => self.client.post(&url),
            "PUT" => self.client.put(&url),
            "DELETE" => self.client.delete(&url),
            _ => return Err(anyhow::anyhow!("Unsupported HTTP method: {}", method)),
        };
        
        // 添加头部
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }
        
        // 添加请求体
        if let Some(body) = parameters.get("body") {
            request = request.json(body);
        }
        
        // 发送请求
        let response = request.send().await?;
        
        // 处理响应
        if response.status().is_success() {
            let json = response.json().await?;
            Ok(json)
        } else {
            Err(anyhow::anyhow!(
                "HTTP request failed: {} - {}",
                response.status(),
                response.text().await?
            ))
        }
    }
} 