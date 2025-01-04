use crate::llm::config::Config;
use crate::llm::llm_provider::{LLMProvider, Message, Provider};
use crate::llm::utils;
use anyhow::Result;
use colored::*;
use futures::StreamExt;
use serde_json;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::select;
use tokio::time::Duration;

pub mod types;
pub mod executor;
mod ui;

use executor::CommandExecutor;
pub use types::{Agent, AgentManager};
use ui::LoadingSpinner;

#[derive(Debug)]
struct ConversationContext {
    messages: Vec<Message>,
    provider: Provider,
    running: Arc<AtomicBool>,
}
/* 对话上下文管理 */
impl ConversationContext {
    fn new(provider: Provider, running: Arc<AtomicBool>) -> Self {
        Self {
            messages: Vec::new(),
            provider,
            running,
        }
    }

    fn add_message(&mut self, role: &str, content: String) {
        self.messages.push(Message {
            role: role.to_string(),
            content,
            name: None,
            function_call: None,
        });
    }
}

impl Agent {
    /* 构建系统提示词 */
    fn build_system_prompt(&self) -> String {
        let mut prompt = String::new();

        // 添加描述
        if let Some(desc) = &self.description {
            prompt.push_str(&format!("{}\n\n", desc));
        }

        // 添加系统提示词
        prompt.push_str(&format!("{}\n\n", self.system_prompt));

        prompt.push_str("作为一个命令执行专家，你需要：\n");
        prompt.push_str("1. 仔细理解用户的需求\n");
        prompt.push_str("2. 选择合适的命令来完成任务\n");
        prompt.push_str("3. 如果需要使用多个命令，将它们组合在一起\n");
        prompt.push_str("4. 确保命令的语法正确\n\n");

        if cfg!(target_os = "windows") {
            prompt.push_str("你现在处于windows系统，请使用windows命令（powershell）\n");
        } else if cfg!(target_os = "macos") {
            prompt.push_str("你现在处于macos系统，请使用macos命令（zsh）\n");
        } else if cfg!(target_os = "linux") {
            prompt.push_str("你现在处于linux系统，请使用linux命令（bash）\n");
        }

        // 添加环境变量信息
        if !self.env.is_empty() {
            prompt.push_str("系统已配置以下环境变量，必要的时候你可以在命令中使用它们：\n");
            for key in self.env.keys() {
                prompt.push_str(&format!("- {}\n", key));
            }
            prompt.push_str("\n使用变量时，请用{{变量名}}的格式，例如: {{variable}}\n");
            prompt.push_str("你可以选择使用或不使用这些变量，具体取决于任务需求\n\n");
        }

        // 添加命令模板参考
        if !self.templates.is_empty() {
            prompt.push_str("需要的时候，你可以使用以下命令模板：\n");
            for (name, template) in &self.templates {
                prompt.push_str(&format!("- {}: `{}`\n", name, template));
            }
            prompt.push_str("你可以选择使用或者不使用这些模板，具体取决于任务需求\n\n");
        }

        prompt.push_str(
            r#"请严格按照以下 JSON 格式回复：
{
    "thought": "详细分析用户需求和你的解决方案",
    "command": "具体要执行的命令"
}

或者当不需要执行命令时：

{
    "thought": "详细解释为什么不需要执行命令",
    "response": "给用户的具体回复"
}

注意事项：
1. thought 必须详细解释你的思考过程
2. command 必须是可以直接执行的完整命令
3. 如果用户的请求不清晰，使用 response 请求更多信息
4. 始终确保命令的安全性和正确性
"#,
        );

        prompt
    }

    pub async fn run(&self, config: &Config, prompt: &str, running: Arc<AtomicBool>) -> Result<()> {
        println!("\n使用 Agent: {}", self.name.green());
        if let Some(desc) = &self.description {
            println!("描述: {}", desc);
        }

        // 获取当前模型配置
        let (_, model_config) = config
            .get_current_model()
            .ok_or_else(|| anyhow::anyhow!("未配置模型"))?;

        // 创建 provider
        let provider = Provider::new(model_config.api_key.clone())
            .with_url(model_config.api_url.clone())
            .with_model(model_config.model.clone())
            .with_json_mode(true);

        let mut context = ConversationContext::new(provider, running);

        // 添加系统提示词
        context.add_message("system", self.build_system_prompt());

        // 添加用户提示
        context.add_message("user", prompt.to_string());

        let executor = CommandExecutor::new(self.env.clone());

        // agent 循环
        loop {
            let response = self.get_llm_response(&context).await?;
            context.add_message("assistant", response.clone());

            // 解析响应
            let parsed: serde_json::Value = serde_json::from_str(&response)?;

            if let Some(command) = parsed.get("command").and_then(|v| v.as_str()) {
                match executor.execute(command).await {
                    Ok(result) => {
                        context.add_message("user", format!("命令执行成功: {}", result));
                        break;
                    }
                    Err(e) => {
                        context.add_message("user", format!("命令执行失败: {}", e));
                        continue;
                    }
                }
            } else if let Some(response_text) = parsed.get("response").and_then(|v| v.as_str()) {
                println!("{}", response_text.green());
                break;
            } else {
                context.add_message("user", "响应格式错误，请重试".to_string());
                continue;
            }
        }
        Ok(())
    }

    async fn get_llm_response(&self, context: &ConversationContext) -> Result<String> {
        let spinner = LoadingSpinner::new();
        let spinner_handle = spinner.start();

        let stream_result = select! {
            result = context.provider.chat(context.messages.clone(), false, context.running.clone()) => {
                spinner.stop();
                let _ = spinner_handle.await?;
                result
            }
            _ = async {
                while context.running.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(50)).await;
                }
            } => {
                spinner.stop();
                let _ = spinner_handle.await?;
                println!("\n{}", "已取消".red());
                return Ok(String::new());
            }
        };

        let mut stream = stream_result?;
        let mut response = String::new();
        let mut is_json_complete = false;

        while let Some(result) = stream.next().await {
            if !context.running.load(Ordering::SeqCst) {
                println!("\n{}", "已取消".red());
                return Ok(response);
            }

            match result {
                Ok(content) if !content.is_empty() => {
                    response.push_str(&content);
                    if !is_json_complete {
                        if let Ok(_) = serde_json::from_str::<serde_json::Value>(&response) {
                            is_json_complete = true;
                            print!("{}", response.green());
                            io::stdout().flush()?;
                        }
                    }
                }
                Err(e) => {
                    eprintln!("\n错误: {}", e);
                    break;
                }
                _ => {}
            }
        }

        if !is_json_complete {
            return Err(anyhow::anyhow!("无效的 JSON 响应: {}", response));
        }

        println!();
        Ok(response)
    }
}

impl AgentManager {
    pub fn load() -> Result<Self> {
        let mut manager = Self::new();

        if let Ok(agents_dir) = Self::get_agents_dir() {
            if agents_dir.exists() {
                for entry in fs::read_dir(agents_dir)? {
                    let entry = entry?;
                    let path = entry.path();
                    if path.extension().map_or(false, |ext| ext == "toml") {
                        let content = fs::read_to_string(&path)?;
                        let agent: Agent = toml::from_str(&content)?;
                        let name = path.file_stem().unwrap().to_string_lossy().to_string();
                        manager.load_agent(&name, agent);
                    }
                }
            }
        }

        Ok(manager)
    }

    pub fn save_agent(&self, name: &str, agent: &Agent) -> Result<()> {
        let path = Self::get_agents_dir()?;
        fs::create_dir_all(&path)?;
        let mut file_path = path;
        file_path.push(format!("{}.toml", name));
        let content = toml::to_string_pretty(agent)?;
        utils::save_file(&content, &file_path)?;
        Ok(())
    }

    pub fn get_agents_dir() -> Result<PathBuf> {
        utils::get_config_dir()
            .map(|mut path| {
                path.push("agents");
                path
            })
            .ok_or_else(|| anyhow::anyhow!("无法获取配置目录"))
    }

    pub fn open_agent_config(name: &str) -> Result<()> {
        let mut path = Self::get_agents_dir()?;
        path.push(format!("{}.toml", name));
        utils::open_file_in_editor(&path)?;
        Ok(())
    }

    pub fn list_agents_info(&self) {
        if self.agents.is_empty() {
            println!("还没有添加任何 agent");
            return;
        }

        println!("可用的 agents:");
        for (name, agent) in &self.agents {
            println!("{}", name.green());
            if let Some(desc) = &agent.description {
                println!("  描述: {}", desc);
            }
            println!("  系统提示词: {}", agent.system_prompt);

            if !agent.env.is_empty() {
                println!("  环境变量:");
                for (key, value) in &agent.env {
                    println!("    - ${{{}}}: {}", key.cyan(), value);
                }
            }

            if !agent.templates.is_empty() {
                println!("  命令模板:");
                for (name, template) in &agent.templates {
                    println!("    - {}: {}", name.cyan(), template);
                }
            }

            println!();
        }
    }
}
