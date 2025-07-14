import { UserData } from "@/resources/UserData";
import {
  AgentChatOptions,
  AgentProps,
  DEFAULT_AGENT,
} from "@common/types/agent";
import { BrowserWindow } from "electron";
import { IpcHandle, registerIpcHandlers } from "../ipc/decorators";
import { ChatHistoryManager } from "../store/ChatHistoryManager";
import { gen } from "../utils/generator";
import { Agent } from "./Agent";
import { ReactAgent } from "./ReactAgent";

/**
 * Agent 管理器
 * 统一管理 Agent 的持久化存储、实例管理、IPC 处理和全局 Agent
 */
export class AgentManager {
  private static instance: AgentManager;

  // 持久化存储
  private agents: Map<string, Agent> = new Map();

  private constructor() {
    registerIpcHandlers(this);
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /** 初始化 */
  async init(): Promise<void> {
    const agentProps =
      await UserData.getInstance().load<Record<string, AgentProps>>(
        "agents.json",
      );
    Object.entries(agentProps).forEach(([id, props]) => {
      this.agents.set(id, new ReactAgent(props));
    });
  }

  async save() {
    const agents = {};
    this.agents.forEach((agent) => {
      const props = agent.getProps();
      agents[props.id] = props;
    });
    console.log("正在保存agents到agents.json:", Object.keys(agents));
    console.log("agents数据:", JSON.stringify(agents, null, 2));
    await UserData.getInstance().save(agents, "agents.json");
    console.log("agents.json保存完成");
  }

  /** 根据ID获取Agent实例 */
  async getById(id: string): Promise<Agent | undefined> {
    try {
      const agent = this.agents.get(id);
      return agent;
    } catch (error) {
      console.error("获取Agent失败:", error);
      return undefined;
    }
  }

  /** 创建新的Agent */
  async create(infos?: Partial<AgentProps>): Promise<Agent> {
    const agentId = gen.id();
    const agentInfos: AgentProps = {
      ...DEFAULT_AGENT,
      id: agentId,
      name: infos?.name || `Agent ${agentId.slice(0, 6)}`,
      ...infos,
    };

    // 创建Agent实例
    const agent = new ReactAgent(agentInfos);
    this.agents.set(agentId, agent);
    
    // 保存到文件
    await this.save();
    
    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-created", agentInfos);
      const agents = {};
      this.agents.forEach((agent) => {
        const props = agent.getProps();
        agents[props.id] = props;
      });
      mainWindow.webContents.send("agents-refreshed", agents);
    }
    return agent;
  }

  /** 删除Agent */
  async delete(id: string): Promise<void> {
    // 从列表中删除
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.close();
    this.agents.delete(id);
    await this.save();
    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-deleted", { id });
      const agents = {};
      this.agents.forEach((agent) => {
        const props = agent.getProps();
        agents[props.id] = props;
      });
      mainWindow.webContents.send("agents-refreshed", agents);
    }
  }

  /** 更新Agent信息 */
  async update(
    id: string,
    data: Partial<Omit<AgentProps, "id">>,
  ): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }
    agent.update(data);
    await this.save();
    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-updated", agent.props);
      const agents = {};
      this.agents.forEach((agent) => {
        const props = agent.getProps();
        agents[props.id] = props;
      });
      mainWindow.webContents.send("agents-refreshed", agents);
    }
  }

  /**
   * 清理所有 Agent 实例
   */
  cleanup(): void {
    // 清理所有 Agent 实例
    for (const [, agent] of this.agents) {
      agent.close();
    }
  }

  // ============ IPC 处理器方法 ============

  /**
   * 获取 Agent 列表
   */
  @IpcHandle("agent-list")
  async getAgentListIpc(): Promise<Record<string, AgentProps>> {
    try {
      const agents: Record<string, AgentProps> = {};
      this.agents.forEach((agent) => {
        const props = agent.getProps();
        agents[props.id] = props;
      });
      return agents;
    } catch (error) {
      console.error("获取 Agent 列表失败:", error);
      return {};
    }
  }

  /**
   * 创建新的 Agent
   */
  @IpcHandle("agent-create")
  async createAgentIpc(infos?: Partial<AgentProps>): Promise<AgentProps> {
    try {
      const agent = await this.create(infos);
      return agent.props;
    } catch (error) {
      console.error("创建 Agent 失败:", error);
      throw new Error(`创建 Agent 失败: ${error}`);
    }
  }

  /**
   * 根据 ID 获取 Agent
   */
  @IpcHandle("agent-get-by-id")
  async getAgentByIdIpc(id: string): Promise<AgentProps | null> {
    try {
      const agent = await this.getById(id);
      return agent ? agent.props : null;
    } catch (error) {
      console.error("获取 Agent 失败:", error);
      return null;
    }
  }

  /**
   * 更新 Agent 信息
   */
  @IpcHandle("agent-update")
  async updateAgentIpc(
    id: string,
    data: Partial<Omit<AgentProps, "id">>,
  ): Promise<void> {
    try {
      await this.update(id, data);
    } catch (error) {
      console.error("更新 Agent 失败:", error);
      throw new Error(`更新 Agent 失败: ${error}`);
    }
  }

  /**
   * 删除 Agent
   */
  @IpcHandle("agent-delete")
  async deleteAgentIpc(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      console.error("删除 Agent 失败:", error);
      throw new Error(`删除 Agent 失败: ${error}`);
    }
  }

  /**
   * Agent 聊天
   */
  @IpcHandle("agent-chat")
  async agentChatIpc(
    id: string,
    message: string,
    options?: AgentChatOptions,
  ): Promise<any> {
    try {
      const agent = await this.getById(id);
      if (!agent) {
        throw new Error(`Agent ${id} 不存在`);
      }
      return await agent.chat(message, options);
    } catch (error) {
      console.error("Agent 聊天失败:", error);
      throw new Error(`Agent 聊天失败: ${error}`);
    }
  }

  /**
   * 停止 Agent
   */
  @IpcHandle("agent-stop")
  async stopAgentIpc(id: string): Promise<void> {
    try {
      const agent = await this.getById(id);
      if (agent) {
        agent.stop();
      }
    } catch (error) {
      console.error("停止 Agent 失败:", error);
    }
  }

  /**
   * 关闭 Agent
   */
  @IpcHandle("agent-close")
  async closeAgentIpc(id: string): Promise<void> {
    try {
      const agent = this.agents.get(id);
      if (agent) {
        agent.close();
      }
    } catch (error) {
      console.error("关闭 Agent 失败:", error);
    }
  }

  /**
   * 诊断 Agent 配置问题
   */
  @IpcHandle("agent-diagnose")
  async diagnoseAgentIpc(id: string): Promise<{
    status: "ok" | "warning" | "error";
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const agent = await this.getById(id);
      if (!agent) {
        return {
          status: "error",
          issues: ["Agent 不存在"],
          recommendations: ["请检查 Agent ID 是否正确"],
        };
      }
      // 调用Agent的诊断方法
      return await (agent as any).diagnoseAgent();
    } catch (error) {
      return {
        status: "error",
        issues: [`诊断过程出错: ${error}`],
        recommendations: ["请检查Agent配置并重试"],
      };
    }
  }

  // ============ 聊天历史管理 IPC 处理器 ============

  /**
   * 获取Agent的聊天会话列表
   */
  @IpcHandle("chat-history-get-sessions")
  async getChatHistorySessionsIpc(agentId: string): Promise<any[]> {
    try {
      return await ChatHistoryManager.getSessionsByAgent(agentId);
    } catch (error) {
      console.error("获取聊天会话列表失败:", error);
      return [];
    }
  }

  /**
   * 获取特定聊天会话
   */
  @IpcHandle("chat-history-get-session")
  async getChatHistorySessionIpc(sessionId: string): Promise<any | null> {
    try {
      return await ChatHistoryManager.getSession(sessionId);
    } catch (error) {
      console.error("获取聊天会话失败:", error);
      return null;
    }
  }

  /**
   * 创建新的聊天会话
   */
  @IpcHandle("chat-history-create-session")
  async createChatHistorySessionIpc(
    agentId: string,
    firstMessage?: any,
  ): Promise<any> {
    try {
      return await ChatHistoryManager.createSession(agentId, firstMessage);
    } catch (error) {
      console.error("创建聊天会话失败:", error);
      throw new Error(`创建聊天会话失败: ${error}`);
    }
  }

  /**
   * 向会话添加消息
   */
  @IpcHandle("chat-history-add-message")
  async addMessageToChatHistoryIpc(
    sessionId: string,
    message: any,
  ): Promise<void> {
    try {
      await ChatHistoryManager.addMessageToSession(sessionId, message);
    } catch (error) {
      console.error("添加消息到会话失败:", error);
      throw new Error(`添加消息到会话失败: ${error}`);
    }
  }

  /**
   * 删除聊天会话
   */
  @IpcHandle("chat-history-delete-session")
  async deleteChatHistorySessionIpc(sessionId: string): Promise<void> {
    try {
      await ChatHistoryManager.deleteSession(sessionId);
    } catch (error) {
      console.error("删除聊天会话失败:", error);
      throw new Error(`删除聊天会话失败: ${error}`);
    }
  }

  /**
   * 删除Agent的所有聊天会话
   */
  @IpcHandle("chat-history-delete-sessions-by-agent")
  async deleteChatHistorySessionsByAgentIpc(agentId: string): Promise<void> {
    try {
      await ChatHistoryManager.deleteSessionsByAgent(agentId);
    } catch (error) {
      console.error("删除Agent的聊天会话失败:", error);
      throw new Error(`删除Agent的聊天会话失败: ${error}`);
    }
  }

  /**
   * 加载聊天会话的消息
   */
  @IpcHandle("chat-history-load-session")
  async loadChatHistorySessionIpc(sessionId: string): Promise<any[]> {
    try {
      const messages = await ChatHistoryManager.getSessionMessages(sessionId);

      // 获取会话信息以确定对应的Agent
      const session = await ChatHistoryManager.getSession(sessionId);
      if (session) {
        // 获取对应的Agent实例
        const agent = await this.getById(session.agentId);

        if (agent) {
          // 将消息设置到Agent的上下文中
          agent.context.update(messages);
          console.log(
            `已将会话 ${sessionId} 的消息加载到Agent ${session.agentId} 的上下文中`,
          );
        }
      }

      return messages;
    } catch (error) {
      console.error("加载聊天会话消息失败:", error);
      return [];
    }
  }

  /**
   * 重置Agent的对话上下文
   */
  @IpcHandle("agent-reset-context")
  async resetAgentContextIpc(agentId: string): Promise<void> {
    try {
      const agent = await this.getById(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} 不存在`);
      }

      // 重置上下文
      agent.context.reset();
      console.log(`Agent ${agentId} 的上下文已重置`);
    } catch (error) {
      console.error("重置Agent上下文失败:", error);
      throw new Error(`重置Agent上下文失败: ${error}`);
    }
  }
}
