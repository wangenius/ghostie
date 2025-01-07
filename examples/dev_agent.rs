use std::sync::Arc;
use anyhow::Result;
use tokio;

use crate::llm::agents::{
    types::AgentManager,
    provider::OpenAIProvider,
    tools::{ToolRegistry, CommandToolHandler, HttpToolHandler},
    factory::AgentFactory,
};

#[tokio::main]
async fn main() -> Result<()> {
    // 1. 创建LLM提供者
    let llm_provider = Arc::new(OpenAIProvider::new(
        std::env::var("OPENAI_API_KEY")?,
        "gpt-3.5-turbo".to_string(),
    ));

    // 2. 创建工具注册器
    let mut tool_registry = ToolRegistry::new();

    // 注册Git工具
    tool_registry.register(
        "git",
        CommandToolHandler::new(
            "git".to_string(),
            vec![],
            Some("./workspace".to_string()),
        ),
    );

    // 注册HTTP工具
    tool_registry.register(
        "http",
        HttpToolHandler::new("https://api.github.com".to_string())
            .with_header("User-Agent", "Dev-Agent"),
    );

    // 注册Shell工具
    tool_registry.register(
        "shell",
        CommandToolHandler::new(
            if cfg!(target_os = "windows") { "cmd" } else { "sh" }.to_string(),
            vec![if cfg!(target_os = "windows") { "/C" } else { "-c" }.to_string()],
            Some("./workspace".to_string()),
        ),
    );

    // 3. 创建Agent管理器
    let agent_manager = Arc::new(AgentManager::new()?);

    // 4. 创建Agent工厂
    let factory = AgentFactory::new(
        agent_manager,
        llm_provider,
        Arc::new(tool_registry),
    );

    // 5. 创建Agent运行时
    let (mut runtime, mut rx) = factory.create_runtime("dev_agent").await?;

    // 6. 处理Agent事件
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                AgentEvent::Output(msg) => println!("Agent输出: {}", msg),
                AgentEvent::ToolCall { name, parameters } => {
                    println!("工具调用: {} {:?}", name, parameters)
                }
                AgentEvent::StateChanged(state) => println!("状态变更: {:?}", state),
                AgentEvent::Error(err) => eprintln!("错误: {}", err),
            }
        }
    });

    // 7. 启动Agent
    runtime.start().await?;

    // 8. 发送一些测试消息
    println!("测试Git命令:");
    runtime.send_message("请执行git status命令".to_string()).await?;

    println!("\n测试HTTP请求:");
    runtime.send_message("请获取GitHub API的用户信息".to_string()).await?;

    println!("\n测试Shell命令:");
    runtime.send_message("请列出当前目录的文件".to_string()).await?;

    Ok(())
} 