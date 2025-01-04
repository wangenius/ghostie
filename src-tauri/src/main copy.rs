/// 主模块
/// 包含命令行界面、交互式聊天、配置管理等核心功能

mod llm_provider;
mod config;
mod bots;
mod update;
mod utils;
mod agents;

use clap::{Command, Arg};
use colored::*;
use dotenv::dotenv;
use anyhow::Result;
use futures::StreamExt;
use std::io::{self, Write, BufRead};
use llm_provider::{LLMProvider, Message, Provider};
use config::Config;
use bots::BotsConfig;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use ctrlc;
use std::time::Duration;
use tokio::time::sleep;
use tokio::select;
use update::Update;
use std::collections::HashMap;
use std::fs;
use agents::{Agent, AgentManager};

const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

/// 添加辅助函数
fn create_message(role: &str, content: String) -> Message {
    Message {
        role: role.to_string(),
        content,
        name: None,
        function_call: None,
    }
}

/// 构建命令行界面
/// 设置所有的命令行参数、子命令和选项
fn build_cli() -> Command {
    let mut cmd = Command::new("gpt")
        .version(env!("CARGO_PKG_VERSION"))
        .author(env!("CARGO_PKG_AUTHORS"))
        .about("GPT Shell - command line AI assistant")
        .arg(
            Arg::new("bot")
                .long("bot")
                .help("use specified bot")
                .value_name("BOT")
        )
        .arg(
            Arg::new("agent")
                .short('a')
                .long("agent")
                .help("use specified agent")
                .value_name("AGENT")
        )
        .arg(
            Arg::new("prompt")
                .help("prompt text to send to GPT")
                .required(false)
        );

    // 添加子命令
    cmd = cmd.subcommand(
        Command::new("update")
            .about("check for updates and update if available")
    );

    // 添加子命令
    cmd = cmd.subcommand(
        Command::new("config")
            .about("configuration management")
            .subcommand(
                Command::new("model")
                    .about("model management")
                    .subcommand(
                        Command::new("add")
                            .about("add new model")
                            .arg(Arg::new("name").required(true))
                            .arg(Arg::new("key").required(true))
                            .arg(
                                Arg::new("url")
                                    .long("url")
                                    .help("API URL")
                            )
                            .arg(
                                Arg::new("model")
                                    .long("model")
                                    .help("model name")
                            )
                    )
                    .subcommand(
                        Command::new("remove")
                            .about("remove model")
                            .arg(Arg::new("name").required(true))
                    )
                    .subcommand(
                        Command::new("list")
                            .about("list all models")
                    )
                    .subcommand(
                        Command::new("use")
                            .about("switch to model")
                            .arg(Arg::new("name").required(true))
                    )
            )
            .subcommand(
                Command::new("system")
                    .about("set system prompt")
                    .arg(Arg::new("prompt"))
            )
            .subcommand(
                Command::new("stream")
                    .about("set stream output")
                    .arg(Arg::new("enabled").required(true))
            )
            .subcommand(
                Command::new("show")
                    .about("show current configuration")
            )
            .subcommand(
                Command::new("edit")
                    .about("edit configuration file")
            )
    );

    cmd = cmd.subcommand(
        Command::new("bots")
            .about("bot management")
            .subcommand(
                Command::new("add")
                    .about("add new bot")
                    .arg(Arg::new("name").required(true))
                    .arg(
                        Arg::new("system")
                            .short('s')
                            .long("system")
                            .required(true)
                    )
            )
            .subcommand(
                Command::new("remove")
                    .about("remove bot")
                    .arg(Arg::new("name").required(true))
            )
            .subcommand(
                Command::new("list")
                    .about("list all bots")
            )
            .subcommand(
                Command::new("edit")
                    .about("edit bots configuration file")
            )
            .subcommand(
                Command::new("use")
                    .about("set current bot")
                    .arg(Arg::new("name").required(true))
            )
            .subcommand(
                Command::new("clear")
                    .about("clear current bot")
            )
            .subcommand(
                Command::new("alias")
                    .about("alias management")
                    .subcommand(
                        Command::new("set")
                            .about("set bot alias")
                            .arg(Arg::new("bot").required(true))
                            .arg(Arg::new("alias").required(true))
                    )
                    .subcommand(
                        Command::new("remove")
                            .about("remove alias")
                            .arg(Arg::new("alias").required(true))
                    )
                    .subcommand(
                        Command::new("list")
                            .about("list all aliases")
                    )
            )
    );

    cmd = cmd.subcommand(
        Command::new("agents")
            .about("agent management")
            .subcommand(
                Command::new("add")
                    .about("add new agent")
                    .arg(Arg::new("name").required(true))
                    .arg(
                        Arg::new("system")
                            .short('s')
                            .long("system")
                            .help("system prompt")
                            .required(true)
                    )
            )
            .subcommand(
                Command::new("remove")
                    .about("remove agent")
                    .arg(Arg::new("name").required(true))
            )
            .subcommand(
                Command::new("list")
                    .about("list all agents")
            )
            .subcommand(
                Command::new("edit")
                    .about("edit agent configuration")
                    .arg(Arg::new("name").required(true))
            )
            .subcommand(
                Command::new("run")
                    .about("run agent with prompt")
                    .arg(Arg::new("name").required(true))
                    .arg(Arg::new("prompt").required(true))
            )
    );

    cmd
}

/// 显示加载动画
/// running: 控制动画是否继续运行的原子布尔值
async fn loading_animation(running: Arc<AtomicBool>) {
    let frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let mut i = 0;
    while running.load(Ordering::SeqCst) {
        print!("\r{} thinking...", frames[i].cyan());
        io::stdout().flush().unwrap();
        i = (i + 1) % frames.len();
        sleep(Duration::from_millis(80)).await;
    }
    print!("\r                                          \r"); // 清除加载动画
    io::stdout().flush().unwrap();
}

/// 执行单次对话
/// config: 程序配置
/// messages: 对话历消息
/// running: 控制对话是否继续的原子布尔值
/// 返回助手的回复内容
async fn chat_once(config: &Config, messages: Vec<Message>, running: Arc<AtomicBool>) -> Result<String> {
    let (_, model_config) = match config.get_current_model() {
        Some(model) => model,
        None => {
            println!("tips: no model configured, please add a model first.");
            println!("you can use the following command to add a model:");
            println!("  gpt config model add <n> <key> [--url <url>] [--model <model>]");
            println!("for example, add deepseek:");
            println!("  gpt config model add deepseek your-api-key --url https://api.deepseek.com/v1/chat/completions --model deepseek-chat");
            return Ok(String::new());
        }
    };

    let provider = Provider::new(model_config.api_key.clone())
        .with_url(model_config.api_url.clone())
        .with_model(model_config.model.clone());

    let loading_running = Arc::new(AtomicBool::new(true));
    let loading_handle = tokio::spawn(loading_animation(loading_running.clone()));

    let stream_result = select! {
        result = provider.chat(messages, config.stream, running.clone()) => {
            loading_running.store(false, Ordering::SeqCst);
            let _ = loading_handle.await;
            result
        }
        _ = async {
            while running.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
        } => {
            loading_running.store(false, Ordering::SeqCst);
            let _ = loading_handle.await;
            println!("\n{}", "cancelled".red());
            return Ok(String::new());
        }
    };

    let mut stream = stream_result?;
    let mut response = String::new();

    while let Some(result) = stream.next().await {
        if !running.load(Ordering::SeqCst) {
            println!("\n{}", "cancelled".red());
            return Ok(response);
        }

        match result {
            Ok(content) if !content.is_empty() => {
                print!("{}", content.green());
                io::stdout().flush()?;
                response.push_str(&content);
            }
            Err(e) => {
                eprintln!("\nerror: {}", e);
                break;
            }
            _ => {}
        }
    }

    if !running.load(Ordering::SeqCst) {
        println!("\n{}", "cancelled".red());
    } else {
        println!();
    }

    Ok(response)
}

/// 交互式对话模式
/// config: 程序配置
/// bot_name: 指定使用的机器人名称
/// bots_config: 机器人配置
/// running: 控制程序是否继续运行的原子布尔值
async fn interactive_mode(config: Config, bot_name: Option<String>, bots_config: BotsConfig, running: Arc<AtomicBool>) -> Result<()> {
    // 首先检查是否配置了模型
    if config.get_current_model().is_none() {
        println!("tips: no model configured, please add a model first.");
        println!("you can use the following command to add a model:");
        println!("  gpt config model add <n> <key> [--url <url>] [--model <model>]");
        println!("for example, add deepseek:");
        println!("  gpt config model add deepseek your-api-key --url https://api.deepseek.com/v1/chat/completions --model deepseek-chat");
        return Ok(());
    }

    let mut messages = Vec::new();
    // if specified bot, use bot's system prompt
    if let Some(bot_name) = bot_name {
        if let Some(bot) = bots_config.get_bot(&bot_name) {
            messages.push(create_message("system", bot.system_prompt.clone()));
            println!("using bot: {}", bot_name.green());
        } else {
            println!("tips: bot not found: {}", bot_name);
            println!("you can use the following command to list all bots:");
            println!("  gpt bots list");
            return Ok(());
        }
    } else if let Some(bot) = bots_config.get_current() {
        // use current bot if set
        messages.push(create_message("system", bot.system_prompt.clone()));
        println!("using current bot: {}", bot.name.green());
    } else if let Some(ref system_prompt) = config.system_prompt {
        // otherwise use default system prompt
        messages.push(create_message("system", system_prompt.clone()));
    }

    println!("enter interactive mode (input 'exit' or press Ctrl+C to exit)");
    println!("---------------------------------------------");

    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut input = String::new();

    loop {
        // reset interrupt flag
        running.store(true, Ordering::SeqCst);

        print!("> ");
        io::stdout().flush()?;
        
        input.clear();
        if reader.read_line(&mut input)? == 0 {
            break;
        }

        let input = input.trim();
        if input.is_empty() {
            continue;
        }
        if input == "exit" {
            break;
        }

        // add user message
        messages.push(create_message("user", input.to_string()));

        // get assistant response
        let response = chat_once(&config, messages.clone(), running.clone()).await?;

        // only add to history if there is a response
        if !response.is_empty() {
            messages.push(create_message("assistant", response));
        }
    }

    println!("bye!");
    Ok(())
}

/// 程序入口点
/// 处理命令行参数并执行相应的功能:
/// - 配置管理(模型、系统提示词等)
/// - 机器人管理
/// - 版本更新
/// - 单次对话或交互式对话
#[tokio::main]
async fn main() -> Result<()> {
    // load environment variables
    dotenv().ok();
    
    // load config
    let mut config = Config::load()?;
    let mut bots_config = BotsConfig::load()?;
    
    // build and get command line arguments
    let mut cmd = build_cli();
    
    // 为每个别名添加短参数
    let aliases: Vec<(String, String)> = bots_config.aliases.iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    
    // 添加别名参数
    let mut alias_args = Vec::new();
    for (alias, _) in &aliases {
        if let Some(c) = alias.chars().next() {
            let id = format!("alias_{}", alias);
            let id_static = Box::leak(id.into_boxed_str()) as &'static str;
            alias_args.push(
                Arg::new(id_static)
                    .short(c)
                    .help(format!("use bot alias '{}'", alias))
                    .action(clap::ArgAction::SetTrue)
            );
        }
    }
    
    // 将别名参数添加到命令中
    for arg in alias_args {
        cmd = cmd.arg(arg);
    }
    
    let matches = cmd.get_matches();

    // set interrupt handler
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    
    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);
    })?;

    // 检查否使用了别名
    let mut bot_name = None;
    for (alias, _) in &aliases {
        let id = format!("alias_{}", alias);
        if matches.get_flag(&id) {
            if let Some(bot) = bots_config.get_bot_by_alias(alias) {
                bot_name = Some(bot.to_string());
                break;
            }
        }
    }

    // 如果没有使用别名，检查是否使用了 --bot 参数
    if bot_name.is_none() {
        bot_name = matches.get_one::<String>("bot").cloned();
    }

    // 处理子命令或提示词
    match matches.subcommand() {
        Some(("config", sub_matches)) => {
            match sub_matches.subcommand() {
                Some(("model", model_matches)) => {
                    match model_matches.subcommand() {
                        Some(("add", add_matches)) => {
                            if let (Some(name), Some(key), Some(url), Some(model)) = (
                                add_matches.get_one::<String>("name"),
                                add_matches.get_one::<String>("key"),
                                add_matches.get_one::<String>("url"),
                                add_matches.get_one::<String>("model")
                            ) {
                                config.add_model(
                                    name.clone(),
                                    key.clone(),
                                    url.clone(),
                                    model.clone()
                                )?;
                            }
                        }
                        Some(("remove", remove_matches)) => {
                            if let Some(name) = remove_matches.get_one::<String>("name") {
                                config.remove_model(name)?;
                            }
                        }
                        Some(("list", _)) => {
                            config.list_models();
                        }
                        Some(("use", use_matches)) => {
                            if let Some(name) = use_matches.get_one::<String>("name") {
                                config.set_current_model(name)?;
                            }
                        }
                        _ => {
                            println!("available model commands:");
                            println!("  gpt config model add <n> <key> [--url <url>] [--model <model>]");
                            println!("  gpt config model remove <n>");
                            println!("  gpt config model list");
                            println!("  gpt config model use <n>");
                        }
                    }
                }
                Some(("system", system_matches)) => {
                    let prompt = system_matches.get_one::<String>("prompt").cloned();
                    config.set_system_prompt(prompt)?;
                }
                Some(("stream", stream_matches)) => {
                    if let Some(enabled) = stream_matches.get_one::<String>("enabled") {
                        config.set_stream(enabled.parse()?)?;
                    }
                }
                Some(("show", _)) => {
                    println!("current config:");
                    if let Some((name, model_config)) = config.get_current_model() {
                        println!("  current model: {}", name.green());
                        println!("  api url: {}", model_config.api_url);
                        println!("  model: {}", model_config.model);
                        println!("  stream: {}", config.stream);
                        if let Some(ref system_prompt) = config.system_prompt {
                            println!("  system prompt: {}", system_prompt);
                        }
                    } else {
                        println!("  no model configured");
                    }
                }
                Some(("edit", _)) => {
                    Config::open_config()?;
                }
                _ => {
                    // 默认显示当前置
                    println!("current config:");
                    if let Some((name, model_config)) = config.get_current_model() {
                        println!("  current model: {}", name.green());
                        println!("  api url: {}", model_config.api_url);
                        println!("  model: {}", model_config.model);
                        println!("  stream: {}", config.stream);
                        if let Some(ref system_prompt) = config.system_prompt {
                            println!("  system prompt: {}", system_prompt);
                        }
                    } else {
                        println!("  no model configured");
                    }
                }
            }
        }
        Some(("bots", sub_matches)) => {
            match sub_matches.subcommand() {
                Some(("add", add_matches)) => {
                    if let (Some(name), Some(system)) = (
                        add_matches.get_one::<String>("name"),
                        add_matches.get_one::<String>("system")
                    ) {
                        bots_config.add_bot(name.clone(), system.clone())?;
                    }
                }
                Some(("remove", remove_matches)) => {
                    if let Some(name) = remove_matches.get_one::<String>("name") {
                        bots_config.remove_bot(name)?;
                    }
                }
                Some(("list", _)) => {
                    bots_config.list_bots();
                }
                Some(("edit", _)) => {
                    BotsConfig::open_config()?;
                }
                Some(("use", use_matches)) => {
                    if let Some(name) = use_matches.get_one::<String>("name") {
                        bots_config.set_current(name)?;
                    }
                }
                Some(("clear", _)) => {
                    bots_config.clear_current()?;
                }
                Some(("alias", alias_matches)) => {
                    match alias_matches.subcommand() {
                        Some(("set", set_matches)) => {
                            if let (Some(bot), Some(alias)) = (
                                set_matches.get_one::<String>("bot"),
                                set_matches.get_one::<String>("alias")
                            ) {
                                bots_config.set_alias(bot.clone(), alias.clone())?;
                            }
                        }
                        Some(("remove", remove_matches)) => {
                            if let Some(alias) = remove_matches.get_one::<String>("alias") {
                                bots_config.remove_alias(alias)?;
                            }
                        }
                        Some(("list", _)) => {
                            bots_config.list_aliases();
                        }
                        _ => {
                            println!("available alias commands:");
                            println!("  gpt bots alias set <bot> <alias>  # set bot alias");
                            println!("  gpt bots alias remove <alias>     # remove alias");
                            println!("  gpt bots alias list               # list all aliases");
                        }
                    }
                }
                _ => {
                    // 默认显示机器人列表
                    bots_config.list_bots();
                }
            }
        }
        Some(("agents", sub_matches)) => {
            match sub_matches.subcommand() {
                Some(("add", add_matches)) => {
                    if let (Some(name), Some(system)) = (
                        add_matches.get_one::<String>("name"),
                        add_matches.get_one::<String>("system")
                    ) {
                        let agent = Agent {
                            name: name.clone(),
                            description: None,
                            system_prompt: system.clone(),
                            env: HashMap::new(),
                            templates: HashMap::new(),
                        };

                        // 保存 agent 配置
                        let manager = AgentManager::load()?;
                        manager.save_agent(name, &agent)?;
                        println!("已添加 agent: {}", name.green());
                        println!("提示: 你可以使用以下命令编辑完整配置：");
                        println!("  gpt agents edit {}", name);
                    }
                }
                Some(("remove", remove_matches)) => {
                    if let Some(name) = remove_matches.get_one::<String>("name") {
                        let mut manager = AgentManager::load()?;
                        if manager.remove_agent(name).is_some() {
                            // 删除配置文件
                            let mut path = AgentManager::get_agents_dir()?;
                            path.push(format!("{}.toml", name));
                            if path.exists() {
                                fs::remove_file(path)?;
                            }
                            println!("已删除 agent: {}", name.green());
                        } else {
                            println!("未找到 agent: {}", name.red());
                        }
                    }
                }
                Some(("list", _)) => {
                    let manager = AgentManager::load()?;
                    manager.list_agents_info();
                }
                Some(("edit", edit_matches)) => {
                    if let Some(name) = edit_matches.get_one::<String>("name") {
                        AgentManager::open_agent_config(name)?;
                    }
                }
                Some(("run", run_matches)) => {
                    if let (Some(name), Some(prompt)) = (
                        run_matches.get_one::<String>("name"),
                        run_matches.get_one::<String>("prompt")
                    ) {
                        let manager = AgentManager::load()?;
                        if let Some(agent) = manager.get_agent(name) {
                            println!("使用 agent: {}", name.green());
                            agent.run(&config, prompt, running.clone()).await?;
                        } else {
                            println!("未找到 agent: {}", name.red());
                        }
                    }
                }
                _ => {
                    println!("可用的 agent 命令：");
                    println!("  gpt agents add <name> --system <prompt>  添加新的 agent");
                    println!("  gpt agents remove <name>                 删除 agent");
                    println!("  gpt agents list                         列出所有 agent");
                    println!("  gpt agents edit <name>                  编辑 agent 配置");
                    println!("  gpt agents run <name> <prompt>          运行 agent");
                }
            }
        }
        Some(("update", _)) => {
            println!("checking for updates...");
            match Update::check_update().await? {
                Some(version) => {
                    println!("new version {} (current: {})", version.green(), CURRENT_VERSION);
                    print!("update to new version? [y/N] ");
                    io::stdout().flush()?;
                    
                    let mut input = String::new();
                    io::stdin().read_line(&mut input)?;
                    
                    if input.trim().to_lowercase() == "y" {
                        println!("downloading and installing update...");
                        if let Err(e) = Update::download_and_replace(&version).await {
                            println!("update failed: {}", e);
                        }
                    } else {
                        println!("update cancelled");
                    }
                }
                None => {
                    println!("you are already using the latest version ({})", CURRENT_VERSION.green());
                }
            }
        }
        _ => {
            // 获取提示词
            if let Some(prompt) = matches.get_one::<String>("prompt") {
                // 如果指定了 agent，使用 agent 的 run 方法
                if let Some(agent_name) = matches.get_one::<String>("agent") {
                    let manager = AgentManager::load()?;
                    if let Some(agent) = manager.get_agent(agent_name) {
                        agent.run(&config, prompt, running).await?;
                    } else {
                        return Err(anyhow::anyhow!("未找到 agent: {}", agent_name));
                    }
                } else {
                    // 单次对话模式
                    let mut messages = Vec::new();

                    if let Some(bot_name) = &bot_name {
                        // 如果指定了机器人，使用机器人的系统提示词
                        if let Some(bot) = bots_config.get_bot(bot_name) {
                            messages.push(create_message("system", bot.system_prompt.clone()));
                        } else {
                            return Err(anyhow::anyhow!("未找到机器人: {}", bot_name));
                        }
                    } else if let Some(bot) = bots_config.get_current() {
                        // 使用当前机器人
                        messages.push(create_message("system", bot.system_prompt.clone()));
                    } else if let Some(ref system_prompt) = config.system_prompt {
                        // 否则用默认系统提示词
                        messages.push(create_message("system", system_prompt.clone()));
                    }

                    // 添加用户消息
                    messages.push(create_message("user", prompt.clone()));

                    // 发送消息并获取回复
                    chat_once(&config, messages, running).await?;
                }
            } else {
                // 交互模式
                interactive_mode(config, bot_name, bots_config, running).await?;
            }
        }
    }
    
    Ok(())
}