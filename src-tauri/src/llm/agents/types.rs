use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Result, anyhow};

use crate::llm::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    #[serde(rename = "type")]
    pub tool_type: String,
    pub description: String,
    #[serde(default)]
    pub parameters: Vec<Parameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub required: bool,
    #[serde(rename = "type")]
    pub param_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Knowledge {
    #[serde(default)]
    pub name: Option<String>,
    pub description: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timing {
    #[serde(rename = "type")]
    pub timing_type: String,
    #[serde(default)]
    pub time: Option<String>,
    #[serde(default)]
    pub day_of_week: Option<i32>,
    #[serde(default)]
    pub day_of_month: Option<i32>,
    pub enable: bool,
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    /// Agent 名称
    pub name: String,
    
    /// Agent 描述
    #[serde(default)]
    pub description: Option<String>,
    
    /// 系统提示信息
    #[serde(rename = "systemPrompt")]
    pub system_prompt: String,

    /// 温度
    pub temperature: f64,

    /// 定时配置
    pub timing: Timing,
    
    /// 工具列表
    #[serde(default)]
    pub tools: Vec<Tool>,

    /// 知识库
    #[serde(default)]
    pub knowledge: Vec<Knowledge>,
    
    /// 环境变量
    #[serde(default)]
    pub env: HashMap<String, String>,
}

/// Agent 管理器
#[derive(Debug, Default)]
pub struct AgentManager {
    pub agents: HashMap<String, Agent>,
    agents_dir: PathBuf,
}

impl AgentManager {
    
    pub fn new() -> Result<Self> {
        let app_dir = utils::get_config_dir().expect("Failed to get config directory");
        let agents_dir = app_dir.join("agents");
        
        // 确保 agents 目录存在
        if !agents_dir.exists() {
            fs::create_dir_all(&agents_dir)?;
        }

        let mut manager = Self {
            agents: HashMap::new(),
            agents_dir,
        };
        
        // 加载所有 agent 配置
        manager.load_all_agents()?;
        
        Ok(manager)
    }

    fn load_all_agents(&mut self) -> Result<()> {
        for entry in fs::read_dir(&self.agents_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("yml") {
                if let Ok(agent) = self.load_agent_from_file(&path) {
                    self.agents.insert(agent.name.clone(), agent);
                }
            }
        }
        Ok(())
    }

    fn load_agent_from_file<P: AsRef<Path>>(&self, path: P) -> Result<Agent> {
        let contents = fs::read_to_string(path)?;
        let agent: Agent = serde_yaml::from_str(&contents)?;
        Ok(agent)
    }

    pub fn save_agent(&self, agent: &Agent) -> Result<()> {
        let yaml = serde_yaml::to_string(agent)?;
        let file_path = self.agents_dir.join(format!("{}.yml", agent.name));
        fs::write(file_path, yaml)?;
        Ok(())
    }

    pub fn load_agent(&mut self, name: &str, config: Agent) -> Result<()> {
        self.save_agent(&config)?;
        self.agents.insert(name.to_string(), config);
        Ok(())
    }

    pub fn get_agent(&self, name: &str) -> Option<&Agent> {
        self.agents.get(name)
    }

    pub fn remove_agent(&mut self, name: &str) -> Result<Option<Agent>> {
        let file_path = self.agents_dir.join(format!("{}.yml", name));
        if file_path.exists() {
            fs::remove_file(file_path)?;
        }
        Ok(self.agents.remove(name))
    }

    pub fn list_agents(&self) -> Vec<&Agent> {
        self.agents.values().collect()
    }

    pub fn update_agent(&mut self, old_name: &str, agent: Agent) -> Result<()> {
        if !self.agents.contains_key(old_name) {
            return Err(anyhow!("agent not found: {}", old_name));
        }

        if old_name != agent.name && self.agents.contains_key(&agent.name) {
            return Err(anyhow!("agent already exists: {}", agent.name));
        }

        // 如果名称改变了，删除旧的配置文件
        if old_name != agent.name {
            let old_file_path = self.agents_dir.join(format!("{}.yml", old_name));
            if old_file_path.exists() {
                fs::remove_file(old_file_path)?;
            }
            self.agents.remove(old_name);
        }

        // 保存新的配置
        self.save_agent(&agent)?;
        self.agents.insert(agent.name.clone(), agent);
        Ok(())
    }
}
