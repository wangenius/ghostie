use std::sync::Arc;
use anyhow::Result;
use tokio;
use std::time::Duration;

use crate::llm::agents::{
    types::AgentManager,
    provider::OpenAIProvider,
    tools::{ToolRegistry, CommandToolHandler, HttpToolHandler},
    factory::AgentFactory,
    runtime::AgentEvent,
};

async fn run_test(message: &str, runtime: &mut Box<dyn AgentRuntime>) -> Result<()> {
    println!("\n测试消息: {}", message);
    println!("----------------------------------------");
    
    let response = runtime.send_message(message.to_string()).await?;
    println!("Agent响应: {}", response);
    println!("----------------------------------------\n");
    
    // 等待一下，让事件处理完成
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // 设置OpenAI API密钥
    std::env::set_var("OPENAI_API_KEY", "your-api-key-here");
    
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
            Some("./examples/workspace".to_string()),
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
            Some("./examples/workspace".to_string()),
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
                AgentEvent::StateChanged(state) => println!("状态: {:?}", state),
                AgentEvent::Error(err) => eprintln!("错误: {}", err),
            }
        }
    });

    // 7. 启动Agent
    runtime.start().await?;

    // 8. 运行测试用例
    
    // 测试Git命令
    run_test("初始化一个新的Git仓库并添加test.txt文件", &mut runtime).await?;
    run_test("查看Git状态", &mut runtime).await?;
    run_test("将test.txt添加到暂存区并提交", &mut runtime).await?;
    
    // 测试HTTP请求
    run_test("获取GitHub API版本信息", &mut runtime).await?;
    run_test("搜索热门Rust项目", &mut runtime).await?;
    
    // 测试Shell命令
    run_test("列出当前目录下的所有文件", &mut runtime).await?;
    run_test("创建一个新的目录test_dir", &mut runtime).await?;
    run_test("在test_dir中创建一个新文件并写入一些内容", &mut runtime).await?;
    
    // 测试组合命令
    run_test("获取一个GitHub项目的信息，然后克隆到本地", &mut runtime).await?;
    
    Ok(())
} 