use crate::plugins::deno;
use anyhow::Result;
use rmcp::{
    model::{CallToolRequestParam, CallToolResult, Tool},
    service::RunningService,
    transport::TokioChildProcess,
    RoleClient, ServiceExt,
};
use std::borrow::Cow;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::process::Command;
use tokio::sync::Mutex;
// MCP管理器结构体，管理多个MCP服务实例
pub struct MCPManager {
    services: Arc<Mutex<HashMap<String, RunningService<RoleClient, ()>>>>,
}

impl MCPManager {
    // 创建新的服务管理器
    pub fn new() -> Result<Self> {
        Ok(Self {
            services: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    // 启动一个新的MCP服务实例，注入环境变量
    pub async fn start_service(&self, service_id: &str) -> Result<()> {
        let mut services = self.services.lock().await;

        // 检查服务是否已存在
        if services.contains_key(service_id) {
            tracing::info!("服务 {} 已经存在", service_id);
            return Ok(());
        }

        // 获取环境变量
        let env_vars = deno::env_list().await?;

        // 创建命令并注入环境变量
        let mut cmd = Command::new("cmd");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        cmd.arg("/c").arg("npx").arg("-y").arg(service_id);

        // 添加所有环境变量到命令
        for env_var in env_vars {
            cmd.env(&env_var.key, &env_var.value);
        }

        // 启动新服务
        let service = ().serve(TokioChildProcess::new(&mut cmd)?).await?;

        services.insert(service_id.to_string(), service);
        tracing::info!("服务 {} 已启动", service_id);

        Ok(())
    }

    // 获取服务信息和工具列表
    pub async fn get_service_info(&self, service_id: &str) -> Result<(String, Vec<Tool>)> {
        let services = self.services.lock().await;

        if let Some(service) = services.get(service_id) {
            let server_info = format!("{:?}", service.peer_info());
            let tools = service.list_all_tools().await?;
            return Ok((server_info, tools));
        }

        anyhow::bail!("服务 {} 不存在", service_id)
    }

    // 调用指定服务的工具
    pub async fn call_tool(
        &self,
        service_id: &str,
        tool_name: &str,
        arguments: serde_json::Map<String, serde_json::Value>,
    ) -> Result<CallToolResult> {
        let services = self.services.lock().await;

        if let Some(service) = services.get(service_id) {
            let result = service
                .call_tool(CallToolRequestParam {
                    name: Cow::Owned(tool_name.to_string()),
                    arguments: Some(arguments),
                })
                .await?;

            return Ok(result);
        }

        anyhow::bail!("服务 {} 不存在", service_id)
    }

    // 停止指定的服务
    pub async fn stop_service(&self, service_id: &str) -> Result<()> {
        let mut services = self.services.lock().await;

        if let Some(service) = services.remove(service_id) {
            service.cancel().await?;
            tracing::info!("服务 {} 已停止", service_id);
            return Ok(());
        }

        anyhow::bail!("服务 {} 不存在", service_id)
    }

    // 停止所有服务
    pub async fn stop_all_services(&self) -> Result<()> {
        let mut services = self.services.lock().await;

        for (service_id, service) in services.drain() {
            service.cancel().await?;
            tracing::info!("服务 {} 已停止", service_id);
        }

        Ok(())
    }

    // 获取已启动的服务列表
    pub async fn list_services(&self) -> Result<Vec<String>> {
        let services = self.services.lock().await;
        Ok(services.keys().cloned().collect())
    }
}
