use anyhow::Result;
use colored::*;
use std::process::Command;
use std::collections::HashMap;

pub struct CommandExecutor {
    env: HashMap<String, String>,
}

impl CommandExecutor {
    pub fn new(env: HashMap<String, String>) -> Self {
        Self { env }
    }

    pub async fn execute(&self, command: &str) -> Result<String> {
        let mut command_str = command.to_string();
        println!("\n原始命令: {}", command_str);
        
        // 替换环境变量
        for (key, value) in &self.env {
            let old = command_str.clone();
            command_str = command_str.replace(&format!("{{{{{}}}}}", key), value);
            if old != command_str {
                println!("  {{{{{}}}}}: {} -> {}", key, old, command_str);
            }
        }

        // 检查是否还有未替换的变量
        if command_str.contains("{{") && command_str.contains("}}") {
            return Err(anyhow::anyhow!("命令中存在未替换的变量: {}", command_str));
        }

        // 执行命令
        let output = if cfg!(target_os = "windows") {
            println!("执行命令: {}", command_str.cyan());
            Command::new("powershell")
                .args(["-Command", &command_str])
                .output()?
        } else {
            Command::new("sh")
                .args(["-c", &command_str])
                .output()?
        };

        let result = if output.status.success() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            String::from_utf8_lossy(&output.stderr).to_string()
        };

        println!("执行结果: {}", if output.status.success() { result.green() } else { result.red() });
        
        if !output.status.success() {
            return Err(anyhow::anyhow!("命令执行失败: {}", result));
        }
        
        Ok(result)
    }
} 