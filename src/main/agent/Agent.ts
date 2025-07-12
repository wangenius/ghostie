import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
} from "./types/agent";
import { gen } from "../utils/generator";
import { Context } from "./context/Context";
import { Engine } from "./engine/Engine";
import { AgentManager } from "../store/AgentManager";
import { IpcHandle, registerIpcHandlers, unregisterIpcHandlers } from "../ipc/decorators";

/** Agent类 */
export class Agent {
  /* 配置信息 */
  infos: AgentInfos;
  /* Agent引擎: 一个Agent的引擎，可能会更换，但是不需要直接体现到数据上 */
  engine: Engine;
  /* 上下文 */
  context: Context;

  /** 构造函数 */
  private constructor(infos: AgentInfos) {
    this.infos = infos;
    this.context = Context.create(this);
    this.engine = Engine.create(this);
    
    // 自动注册 IPC 处理器
    registerIpcHandlers(this);
  }

  /** 创建代理或者获取代理 */
  static async create(id?: string): Promise<Agent> {
    /* 创建代理 */
    const agentsList = await AgentManager.getList();
    let infos = agentsList[id || ""];
    if (!infos) {
      infos = { ...DEFAULT_AGENT, id: id || gen.id() };
    }
    const agent = new Agent(infos);
    /* 返回代理 */
    return agent;
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentInfos, "id">>) {
    this.infos = { ...this.infos, ...data };
    /* update之后更新引擎 */
    this.engine = Engine.create(this);
    return this;
  }

  /* 机器人对话 */
  async chat(input: string, options?: AgentChatOptions) {
    let content = input;
    return await this.engine.execute(content);
  }

  stop() {
    this.engine.stop();
  }

  close() {
    this.engine.close();
    // 取消注册 IPC 处理器
    unregisterIpcHandlers(this);
  }

  // ============ IPC 处理器方法 ============

  /**
   * 获取 Agent 列表
   */
  @IpcHandle("agent-list")
  async getAgentList(): Promise<Record<string, AgentInfos>> {
    try {
      return await AgentManager.getList();
    } catch (error) {
      console.error("获取 Agent 列表失败:", error);
      return {};
    }
  }

  /**
   * 创建新的 Agent
   */
  @IpcHandle("agent-create")
  async createAgent(infos?: Partial<AgentInfos>): Promise<AgentInfos> {
    try {
      const agent = await AgentManager.create(infos);
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
  async getAgentById(id: string): Promise<AgentInfos | null> {
    try {
      const agent = await AgentManager.getById(id);
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
  async updateAgent(id: string, data: Partial<Omit<AgentInfos, "id">>): Promise<void> {
    try {
      await AgentManager.update(id, data);
    } catch (error) {
      console.error("更新 Agent 失败:", error);
      throw new Error(`更新 Agent 失败: ${error}`);
    }
  }

  /**
   * 删除 Agent
   */
  @IpcHandle("agent-delete")
  async deleteAgent(id: string): Promise<void> {
    try {
      await AgentManager.delete(id);
    } catch (error) {
      console.error("删除 Agent 失败:", error);
      throw new Error(`删除 Agent 失败: ${error}`);
    }
  }

  /**
   * Agent 聊天
   */
  @IpcHandle("agent-chat")
  async agentChat(id: string, message: string, options?: any): Promise<any> {
    try {
      const agent = await AgentManager.getById(id);
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
  async getCurrentAgent(): Promise<AgentInfos> {
    return this.infos;
  }

  /**
   * 停止当前 Agent
   */
  @IpcHandle("agent-stop")
  async stopAgent(): Promise<void> {
    this.stop();
  }

  /**
   * 关闭当前 Agent
   */
  @IpcHandle("agent-close")
  async closeAgent(): Promise<void> {
    this.close();
  }
}
