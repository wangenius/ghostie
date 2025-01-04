use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    /// Agent 名称
    pub name: String,
    
    /// Agent 描述
    pub description: Option<String>,
    
    /// 系统提示信息
    pub system_prompt: String,
    
    /// 环境变量
    #[serde(default)]
    pub env: HashMap<String, String>,
    
    /// 命令模板参考
    #[serde(default)]
    pub templates: HashMap<String, String>,
}

/// Agent 管理器
#[derive(Debug, Default)]
pub struct AgentManager {
    pub agents: HashMap<String, Agent>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            agents: HashMap::new(),
        }
    }

    pub fn load_agent(&mut self, name: &str, config: Agent) {
        self.agents.insert(name.to_string(), config);
    }

    pub fn get_agent(&self, name: &str) -> Option<&Agent> {
        self.agents.get(name)
    }

    pub fn remove_agent(&mut self, name: &str) -> Option<Agent> {
        self.agents.remove(name)
    }
}
