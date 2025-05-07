import { AgentInfos, AgentMarketProps } from "@/agent/types/agent";
import { Toolkit, ToolkitStore } from "@/toolkit/Toolkit";
import { supabase } from "@/utils/supabase";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { ToolkitCloudManager } from "./ToolkitCloudManager";
import { MCP, MCPStore } from "@/toolkit/MCP";
import { AgentManager } from "@/store/AgentManager";
import { UserMananger } from "@/services/user/User";

export class AgentCloudManager {
  /** 检查Agent是否已存在且属于当前用户 */
  static async checkAgentExists(agentId: string): Promise<boolean> {
    // 检查是否已经有了相同id和user_id的Agent
    const { data } = await supabase
      .from("agents")
      .select("id, user_id")
      .eq("id", agentId);

    // 获取当前用户ID
    const currentUser = UserMananger.store.current;
    const currentUserId = currentUser?.id;

    // 如果存在相同id的Agent，且属于当前用户，则返回true
    if (data && data.length > 0) {
      const existingAgent = data[0];
      return existingAgent.user_id === currentUserId;
    }

    return false;
  }

  /** 更新市场中的Agent */
  static async updateFromMarket(agent: AgentInfos) {
    try {
      const { error } = await supabase
        .from("agents")
        .update({
          name: agent.name,
          description: agent.description || agent.system,
          body: agent,
          version: agent.version,
        })
        .eq("id", agent.id);
      if (error) {
        throw JSON.stringify(error);
      }
    } catch (error) {
      console.error("updateFromMarket error:", error);
      throw error;
    }
    return;
  }

  static async uploadToMarket(agent: AgentInfos) {
    // 获取当前用户ID
    const currentUser = UserMananger.store.current;
    const currentUserId = currentUser?.id;

    if (!currentUserId) {
      throw new Error("用户未登录，无法上传Agent");
    }

    // 检查Agent是否已存在且属于当前用户
    const isUpdate = await this.checkAgentExists(agent.id);

    // 如果存在且属于当前用户，则执行更新操作
    if (isUpdate) {
      // 处理相关依赖组件（工作流、插件等）
      await this.processAgentDependencies(agent);
      return await this.updateFromMarket(agent);
    }

    // 检查是否存在相同ID但不同用户的Agent
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agent.id);

    if (data && data.length > 0) {
      // 存在相同ID但不同用户的Agent，抛出错误
      throw new Error("Agent with this id already exists by another user");
    }

    // 处理相关依赖组件
    await this.processAgentDependencies(agent);

    // 上传到 Supabase
    const { error } = await supabase.from("agents").insert({
      id: agent.id,
      name: agent.name,
      description: agent.description || agent.system,
      body: agent,
      user_id: currentUserId,
      version: agent.version,
    });

    if (error) {
      throw error;
    }
    return;
  }

  // 处理Agent的依赖组件（工作流、插件、MCP等）
  private static async processAgentDependencies(agent: AgentInfos) {
    // 处理workflows
    const processedWorkflows = new Set<string>();
    for (const workflowId of agent.workflows || []) {
      if (!processedWorkflows.has(workflowId)) {
        try {
          const workflowInstance = await Workflow.get(workflowId);
          try {
            await workflowInstance.uploadToMarket();
            console.log(`工作流 ${workflowId} 上传成功`);
          } catch (uploadError) {
            console.log(`工作流 ${workflowId} 已存在或上传失败，继续执行...`);
          }
          processedWorkflows.add(workflowId);
        } catch (error) {
          console.log(`获取工作流 ${workflowId} 失败，继续执行...`, error);
        }
      }
    }

    // 处理tools
    const processedTools = new Set<string>();
    for (const tool of agent.tools || []) {
      if (!processedTools.has(tool.plugin)) {
        try {
          const plugin = await Toolkit.get(tool.plugin);
          try {
            await ToolkitCloudManager.uploadToMarket(plugin);
            console.log(`插件 ${tool.plugin} 上传成功`);
          } catch (uploadError) {
            console.log(`插件 ${tool.plugin} 已存在或上传失败，继续执行...`);
          }
          processedTools.add(tool.plugin);
        } catch (error) {
          console.log(`获取插件 ${tool.plugin} 失败，继续执行...`, error);
        }
      }
    }

    // 处理mcps
    const processedMcps = new Set<string>();
    for (const mcp of agent.mcps || []) {
      if (!processedMcps.has(mcp.server)) {
        try {
          const mcpInstance = await MCP.get(mcp.server);
          // MCP目前没有上传到市场的功能,这里先记录日志
          console.log(
            `MCP ${mcp.server} 记录: ${JSON.stringify(mcpInstance.props)}`,
          );
          processedMcps.add(mcp.server);
        } catch (error) {
          console.log(`获取MCP ${mcp.server} 失败，继续执行...`, error);
        }
      }
    }
  }

  static async fetchMarketData(
    page: number = 1,
    limit: number = 10,
  ): Promise<AgentMarketProps[]> {
    // 获取当前页数据
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw error;
    }
    console.log(data);
    return (data as AgentMarketProps[]) || [];
  }

  static async installFromMarket(data: AgentMarketProps) {
    // 获取现有的插件、工作流和MCP,用于检查是否已安装
    const existingPlugins = await ToolkitStore.getCurrent();
    const existingWorkflows = await WorkflowsStore.getCurrent();
    const existingMCPs = await MCPStore.getCurrent();

    // 存储需要安装的组件ID
    const pluginsToInstall = new Set<string>();
    const workflowsToInstall = new Set<string>();
    const mcpsToInstall = new Set<string>();

    // 检查并收集需要安装的工作流
    for (const workflowId of data.body.workflows || []) {
      if (!existingWorkflows[workflowId]) {
        workflowsToInstall.add(workflowId);
      }
    }

    // 检查并收集需要安装的插件
    for (const tool of data.body.tools || []) {
      if (!existingPlugins[tool.plugin]) {
        pluginsToInstall.add(tool.plugin);
      }
    }

    // 检查并收集需要安装的MCP
    for (const mcp of data.body.mcps || []) {
      if (!existingMCPs[mcp.server]) {
        mcpsToInstall.add(mcp.server);
      }
    }

    // 安装缺失的工作流
    for (const workflowId of workflowsToInstall) {
      try {
        // 从市场获取工作流数据
        const { data: workflowData, error } = await supabase
          .from("workflows")
          .select("*")
          .eq("id", workflowId)
          .single();

        if (error) {
          console.error(`获取工作流 ${workflowId} 失败:`, error);
          continue;
        }

        if (workflowData) {
          // 安装工作流
          await Workflow.installFromMarket(workflowData);
          console.log(`成功安装工作流: ${workflowData.name}`);
        }
      } catch (error) {
        console.error(`安装工作流 ${workflowId} 失败:`, error);
      }
    }

    // 安装缺失的插件
    for (const pluginId of pluginsToInstall) {
      try {
        // 从市场获取插件数据
        const { data: pluginData, error } = await supabase
          .from("plugins")
          .select("*")
          .eq("id", pluginId)
          .single();

        if (error) {
          console.error(`获取插件 ${pluginId} 失败:`, error);
          continue;
        }

        if (pluginData) {
          // 安装插件
          await ToolkitCloudManager.installFromMarket(pluginData);
          console.log(`成功安装插件: ${pluginData.name}`);
        }
      } catch (error) {
        console.error(`安装插件 ${pluginId} 失败:`, error);
      }
    }

    // 安装缺失的MCP
    for (const mcpId of mcpsToInstall) {
      try {
        // 从市场获取MCP数据
        const { data: mcpData, error } = await supabase
          .from("mcps")
          .select("*")
          .eq("id", mcpId)
          .single();

        if (error) {
          console.error(`获取MCP ${mcpId} 失败:`, error);
          continue;
        }

        if (mcpData) {
          // 安装MCP
          // 注意：这里假设MCP有类似的installFromMarket方法
          // 如果没有，需要根据实际情况处理
          await MCP.create(mcpData);
          console.log(`成功安装MCP: ${mcpData.name}`);
        }
      } catch (error) {
        console.error(`安装MCP ${mcpId} 失败:`, error);
      }
    }

    /* 保存代理 */
    AgentManager.list.set({
      [data.id]: data.body,
    });
    return;
  }

  /* 从市场卸载 */
  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }
}
