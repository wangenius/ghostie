import { UserData } from "@/resources/UserData";
import { AgentInfos, DEFAULT_AGENT, AgentChatOptions } from "@common/types/agent";
import { BrowserWindow } from "electron";
import { gen } from "../utils/generator";
import { Agent } from "./Agent";
import { ReactAgent } from "./ReactAgent";
import { IpcHandle, registerIpcHandlers } from "../ipc/decorators";
import { ChatHistoryManager } from "../store/ChatHistoryManager";

/**
 * Agent 管理器
 * 统一管理 Agent 的持久化存储、实例管理、IPC 处理和全局 Agent
 */
export class AgentManager {
  private static instance: AgentManager;

  // 持久化存储
  private agentsList: Record<string, AgentInfos> = {};

  // 运行时状态
  private openedAgents: Map<string, Agent> = new Map();
  private globalAgent: Agent | null = null;
  private currentOpenedAgent: string = "";
  private loadingState: Record<string, boolean> = {};

  private constructor() {
    // 注册IPC处理器
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
    this.agentsList =
      await UserData.getInstance().load<Record<string, AgentInfos>>(
        "agents.json",
      );
    await this.initializeGlobalAgent();
  }

  /**
   * 初始化全局 Agent 实例
   * 这个实例将处理所有的 IPC 请求
   */
  private async initializeGlobalAgent(): Promise<void> {
    if (this.globalAgent) {
      return;
    }

    try {
      // 创建一个全局 Agent 实例来处理 IPC 请求
      // 使用默认配置确保有文本模型
      this.globalAgent = await Agent.create("global-agent");
      console.log("全局 Agent IPC 处理器已初始化");
    } catch (error) {
      console.error("初始化全局 Agent 失败:", error);

      this.globalAgent = new ReactAgent({
        ...DEFAULT_AGENT,
        id: "global-agent",
        name: "Global Agent",
        system: "你是一个全局的AI助手，用于处理系统级的请求。",
      });
      console.log("使用默认配置创建全局 Agent");
    }
  }

  /**
   * 获取全局 Agent 实例
   */
  getGlobalAgent(): Agent | null {
    return this.globalAgent;
  }

  /** 获取所有 Agent 列表 */
  async getList(): Promise<Record<string, AgentInfos>> {
    return { ...this.agentsList };
  }

  /** 根据ID获取Agent实例 */
  async getById(id: string): Promise<Agent | null> {
    try {
      // 先检查是否已经有打开的实例
      const openedAgent = this.openedAgents.get(id);
      if (openedAgent) {
        return openedAgent;
      }

      // 检查 Agent 是否存在于列表中
      if (!this.agentsList[id]) {
        return null;
      }

      // 创建新的Agent实例
      const agent = await Agent.create(id);

      // 存储到打开的Agent列表中
      this.openedAgents.set(id, agent);

      return agent;
    } catch (error) {
      console.error("获取Agent失败:", error);
      return null;
    }
  }

  /**
   * 获取 Agent 实例（兼容 AgentIpcManager 接口）
   */
  getAgent(id: string): Agent | undefined {
    return this.openedAgents.get(id);
  }

  /** 创建新的Agent */
  async create(infos?: Partial<AgentInfos>): Promise<Agent> {
    const agentId = gen.id();
    const agentInfos: AgentInfos = {
      ...DEFAULT_AGENT,
      id: agentId,
      name: infos?.name || `Agent ${agentId.slice(0, 6)}`,
      ...infos,
    };

    // 保存到列表中
    this.agentsList[agentId] = agentInfos;
    await UserData.getInstance().save(this.agentsList, "agents.json");

    // 创建Agent实例
    const agent = await Agent.create(agentId);

    // 存储到打开的Agent列表中
    this.openedAgents.set(agentId, agent);

    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-created", agentInfos);
      mainWindow.webContents.send("agents-refreshed", { ...this.agentsList });
    }

    return agent;
  }

  /**
   * 创建并注册新的 Agent（兼容 AgentIpcManager 接口）
   */
  async createAgent(id?: string, infos?: Partial<AgentInfos>): Promise<Agent> {
    if (id) {
      // 如果指定了ID，直接创建
      const agent = await Agent.create(id);
      if (infos) {
        await agent.update(infos);
      }
      this.openedAgents.set(id, agent);
      return agent;
    } else {
      // 否则使用标准创建流程
      return await this.create(infos);
    }
  }

  /** 删除Agent */
  async delete(id: string): Promise<void> {
    // 从列表中删除
    delete this.agentsList[id];
    await UserData.getInstance().save(this.agentsList, "agents.json");

    // 从打开的实例中删除
    const agent = this.openedAgents.get(id);
    if (agent) {
      agent.close();
      this.openedAgents.delete(id);
    }

    // 如果是当前激活的Agent，清除激活状态
    if (this.currentOpenedAgent === id) {
      this.currentOpenedAgent = "";
    }

    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-deleted", { id });
      mainWindow.webContents.send("agents-refreshed", { ...this.agentsList });
    }
  }

  /**
   * 删除 Agent 实例（兼容 AgentIpcManager 接口）
   */
  removeAgent(id: string): void {
    const agent = this.openedAgents.get(id);
    if (agent) {
      agent.close(); // 这会自动取消注册 IPC 处理器
      this.openedAgents.delete(id);
    }
  }

  /** 更新Agent信息 */
  async update(
    id: string,
    data: Partial<Omit<AgentInfos, "id">>,
  ): Promise<void> {
    const currentInfos = this.agentsList[id];
    if (!currentInfos) {
      throw new Error(`Agent ${id} not found`);
    }

    const updatedInfos = { ...currentInfos, ...data };

    // 更新列表中的信息
    this.agentsList[id] = updatedInfos;
    await UserData.getInstance().save(this.agentsList, "agents.json");

    // 如果有打开的实例，也更新实例
    const openedAgent = this.openedAgents.get(id);
    if (openedAgent) {
      await openedAgent.update(data);
    }

    // 发送事件到前端
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("agent-updated", updatedInfos);
      mainWindow.webContents.send("agents-refreshed", { ...this.agentsList });
    }
  }

  /** 获取当前激活的 Agent ID */
  getCurrentAgentId(): string {
    return this.currentOpenedAgent;
  }

  /** 设置当前激活的 Agent */
  setCurrentAgent(id: string): void {
    this.currentOpenedAgent = id;
  }

  /** 获取加载状态 */
  getLoadingState(id: string): boolean {
    return this.loadingState[id] || false;
  }

  /** 设置加载状态 */
  setLoadingState(id: string, loading: boolean): void {
    this.loadingState[id] = loading;
  }

  /**
   * 获取所有 Agent 实例（兼容 AgentIpcManager 接口）
   */
  getAllAgents(): Map<string, Agent> {
    return new Map(this.openedAgents);
  }

  /**
   * 清理所有 Agent 实例
   */
  cleanup(): void {
    // 清理所有 Agent 实例
    for (const [, agent] of this.openedAgents) {
      agent.close();
    }
    this.openedAgents.clear();

    // 清理全局 Agent
    if (this.globalAgent) {
      this.globalAgent.close();
      this.globalAgent = null;
    }
  }

  // ============ IPC 处理器方法 ============

  /**
   * 获取 Agent 列表
   */
  @IpcHandle("agent-list")
  async getAgentListIpc(): Promise<Record<string, AgentInfos>> {
    try {
      return await this.getList();
    } catch (error) {
      console.error("获取 Agent 列表失败:", error);
      return {};
    }
  }

  /**
   * 创建新的 Agent
   */
  @IpcHandle("agent-create")
  async createAgentIpc(infos?: Partial<AgentInfos>): Promise<AgentInfos> {
    try {
      const agent = await this.create(infos);
      return agent.infos;
    } catch (error) {
      console.error("创建 Agent 失败:", error);
      throw new Error(`创建 Agent 失败: ${error}`);
    }
  }

  /**
   * 根据 ID 获取 Agent
   */
  @IpcHandle("agent-get-by-id")
  async getAgentByIdIpc(id: string): Promise<AgentInfos | null> {
    try {
      const agent = await this.getById(id);
      return agent ? agent.infos : null;
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
    data: Partial<Omit<AgentInfos, "id">>,
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
  async agentChatIpc(id: string, message: string, options?: AgentChatOptions): Promise<any> {
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
   * 获取当前 Agent 信息
   */
  @IpcHandle("agent-get-current")
  async getCurrentAgentIpc(): Promise<AgentInfos | null> {
    try {
      if (!this.currentOpenedAgent) {
        return null;
      }
      const agent = await this.getById(this.currentOpenedAgent);
      return agent ? agent.infos : null;
    } catch (error) {
      console.error("获取当前 Agent 失败:", error);
      return null;
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
      const agent = this.openedAgents.get(id);
      if (agent) {
        agent.close();
        this.openedAgents.delete(id);
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
          recommendations: ["请检查 Agent ID 是否正确"]
        };
      }
      // 调用Agent的诊断方法
      return await (agent as any).diagnoseAgent();
    } catch (error) {
      return {
        status: "error",
        issues: [`诊断过程出错: ${error}`],
        recommendations: ["请检查Agent配置并重试"]
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

  static async init(): Promise<void> {
    const instance = AgentManager.getInstance();
    await instance.init();
  }

  static async getList(): Promise<Record<string, AgentInfos>> {
    const instance = AgentManager.getInstance();
    return await instance.getList();
  }

  static async getById(id: string): Promise<Agent | null> {
    const instance = AgentManager.getInstance();
    return await instance.getById(id);
  }

  static async create(infos?: Partial<AgentInfos>): Promise<Agent> {
    const instance = AgentManager.getInstance();
    return await instance.create(infos);
  }

  static async delete(id: string): Promise<void> {
    const instance = AgentManager.getInstance();
    await instance.delete(id);
  }

  static async update(
    id: string,
    data: Partial<Omit<AgentInfos, "id">>,
  ): Promise<void> {
    const instance = AgentManager.getInstance();
    await instance.update(id, data);
  }

  static getCurrentAgentId(): string {
    const instance = AgentManager.getInstance();
    return instance.getCurrentAgentId();
  }

  static setCurrentAgent(id: string): void {
    const instance = AgentManager.getInstance();
    instance.setCurrentAgent(id);
  }

  static getLoadingState(id: string): boolean {
    const instance = AgentManager.getInstance();
    return instance.getLoadingState(id);
  }

  static setLoadingState(id: string, loading: boolean): void {
    const instance = AgentManager.getInstance();
    instance.setLoadingState(id, loading);
  }
}
