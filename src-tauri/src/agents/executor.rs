use anyhow::Result;
use colored::*;
use std::process::Command;

pub struct CommandExecutor {}

impl CommandExecutor {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn execute(&self, command: &str) -> Result<String> {
        let command_str = command.to_string();
        println!("\n原始命令: {}", command_str);

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
            Command::new("sh").args(["-c", &command_str]).output()?
        };

        let result = if output.status.success() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            String::from_utf8_lossy(&output.stderr).to_string()
        };

        println!(
            "执行结果: {}",
            if output.status.success() {
                result.green()
            } else {
                result.red()
            }
        );

        if !output.status.success() {
            return Err(anyhow::anyhow!("命令执行失败: {}", result));
        }

        Ok(result)
    }
}
