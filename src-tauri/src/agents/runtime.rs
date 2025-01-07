use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;
use tokio::sync::mpsc;
use std::sync::Arc;
use crate::llm::agents::{
    types::{Agent, Tool},
    provider::{LLMProvider, ChatMessage, Function},
    tools::ToolRegistry,
};

/// Agent运行时状态
#[derive(Debug, Clone)]
pub enum AgentState {
    Ready,
    Running,
    Paused,
    Stopped,
    Error(String),
}

/// Agent运行时事件
#[derive(Debug, Clone)]
pub enum AgentEvent {
    StateChanged(AgentState),
    Output(String),
    ToolCall{name: String, parameters: Value},
    Error(String),
}

/// Agent运行时接口
#[async_trait]
pub trait AgentRuntime: Send + Sync {
    /// 获取Agent配置
    fn get_agent(&self) -> &Agent;
    
    /// 获取当前状态
    fn get_state(&self) -> AgentState;
    
    /// 启动Agent
    async fn start(&mut self) -> Result<()>;
    
    /// 暂停Agent
    async fn pause(&mut self) -> Result<()>;
    
    /// 停止Agent
    async fn stop(&mut self) -> Result<()>;
    
    /// 发送消息给Agent
    async fn send_message(&mut self, message: String) -> Result<String>;
    
    /// 调用工具
    async fn call_tool(&mut self, tool: &Tool, parameters: Value) -> Result<Value>;
}

/// 基础Agent运行时实现
pub struct BasicAgentRuntime {
    agent: Agent,
    state: AgentState,
    event_tx: mpsc::Sender<AgentEvent>,
    llm_provider: Arc<dyn LLMProvider>,
    tool_registry: Arc<ToolRegistry>,
    message_history: Vec<ChatMessage>,
}

impl BasicAgentRuntime {
    pub fn new(
        agent: Agent,
        event_tx: mpsc::Sender<AgentEvent>,
        llm_provider: Arc<dyn LLMProvider>,
        tool_registry: Arc<ToolRegistry>,
    ) -> Self {
        let mut message_history = Vec::new();
        message_history.push(ChatMessage {
            role: "system".to_string(),
            content: agent.system_prompt.clone(),
        });
        
        Self {
            agent,
            state: AgentState::Ready,
            event_tx,
            llm_provider,
            tool_registry,
            message_history,
        }
    }

    async fn set_state(&mut self, state: AgentState) {
        self.state = state.clone();
        let _ = self.event_tx.send(AgentEvent::StateChanged(state)).await;
    }
    
    fn convert_tools_to_functions(&self) -> Vec<Function> {
        self.agent.tools.iter().map(|tool| Function {
            name: tool.name.clone(),
            description: tool.description.clone(),
            parameters: serde_json::to_value(&tool.parameters).unwrap_or(Value::Null),
        }).collect()
    }
}

#[async_trait]
impl AgentRuntime for BasicAgentRuntime {
    fn get_agent(&self) -> &Agent {
        &self.agent
    }

    fn get_state(&self) -> AgentState {
        self.state.clone()
    }

    async fn start(&mut self) -> Result<()> {
        self.set_state(AgentState::Running).await;
        Ok(())
    }

    async fn pause(&mut self) -> Result<()> {
        self.set_state(AgentState::Paused).await;
        Ok(())
    }

    async fn stop(&mut self) -> Result<()> {
        self.set_state(AgentState::Stopped).await;
        Ok(())
    }

    async fn send_message(&mut self, message: String) -> Result<String> {
        let _ = self.event_tx.send(AgentEvent::Output(message.clone())).await;
        
        // 添加用户消息到历史
        self.message_history.push(ChatMessage {
            role: "user".to_string(),
            content: message,
        });
        
        // 获取可用的函数列表
        let functions = self.convert_tools_to_functions();
        
        // 调用LLM进行函数调用
        let function_call = self.llm_provider
            .function_call(self.message_history.clone(), functions)
            .await?;
            
        // 如果LLM选择调用函数
        if function_call.name != "" {
            // 查找对应的工具
            if let Some(tool) = self.agent.tools.iter().find(|t| t.name == function_call.name) {
                // 发送工具调用事件
                let _ = self.event_tx
                    .send(AgentEvent::ToolCall {
                        name: tool.name.clone(),
                        parameters: function_call.arguments.clone(),
                    })
                    .await;
                
                // 执行工具调用
                let result = self.tool_registry
                    .execute(tool, function_call.arguments)
                    .await?;
                    
                // 添加函数调用结果到历史
                self.message_history.push(ChatMessage {
                    role: "function".to_string(),
                    content: serde_json::to_string(&result)?,
                });
            }
        }
        
        // 获取最终回复
        let response = self.llm_provider.chat(self.message_history.clone()).await?;
        
        // 添加助手回复到历史
        self.message_history.push(ChatMessage {
            role: "assistant".to_string(),
            content: response.clone(),
        });
        
        Ok(response)
    }

    async fn call_tool(&mut self, tool: &Tool, parameters: Value) -> Result<Value> {
        let _ = self.event_tx
            .send(AgentEvent::ToolCall {
                name: tool.name.clone(),
                parameters: parameters.clone(),
            })
            .await;
            
        self.tool_registry.execute(tool, parameters).await
    }
} 