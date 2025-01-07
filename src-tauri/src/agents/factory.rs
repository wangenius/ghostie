use std::sync::Arc;
use anyhow::Result;
use tokio::sync::mpsc;
use crate::llm::agents::{
    types::{Agent, AgentManager},
    runtime::{AgentRuntime, BasicAgentRuntime, AgentEvent},
    provider::LLMProvider,
    tools::ToolRegistry,
};

/// Agent工厂
pub struct AgentFactory {
    agent_manager: Arc<AgentManager>,
    llm_provider: Arc<dyn LLMProvider>,
    tool_registry: Arc<ToolRegistry>,
}

impl AgentFactory {
    pub fn new(
        agent_manager: Arc<AgentManager>,
        llm_provider: Arc<dyn LLMProvider>,
        tool_registry: Arc<ToolRegistry>,
    ) -> Self {
        Self {
            agent_manager,
            llm_provider,
            tool_registry,
        }
    }

    /// 创建Agent运行时实例
    pub async fn create_runtime(&self, name: &str) -> Result<(Box<dyn AgentRuntime>, mpsc::Receiver<AgentEvent>)> {
        let agent = self.agent_manager
            .get_agent(name)
            .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", name))?
            .clone();

        let (tx, rx) = mpsc::channel(100);
        let runtime = Box::new(BasicAgentRuntime::new(
            agent,
            tx,
            self.llm_provider.clone(),
            self.tool_registry.clone(),
        ));
        
        Ok((runtime, rx))
    }

    /// 获取所有可用的Agent配置
    pub fn list_available_agents(&self) -> Vec<&Agent> {
        self.agent_manager.list_agents()
    }
} 