import { AgentInfos, ChatMessage, AgentChatOptions } from '@common/types/agent';
import { cmd } from '@/utils/shell';

export class AgentService {
  /**
   * 获取所有 Agent 列表
   */
  static async getAgentList(): Promise<Record<string, AgentInfos>> {
    try {
      return await cmd.invoke('agent-list');
    } catch (error) {
      console.error('获取 Agent 列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据 ID 获取 Agent 信息
   */
  static async getAgentById(id: string): Promise<AgentInfos | null> {
    try {
      return await cmd.invoke('agent-get-by-id', id);
    } catch (error) {
      console.error('获取 Agent 信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建新的 Agent
   */
  static async createAgent(infos?: Partial<AgentInfos>): Promise<AgentInfos> {
    try {
      return await cmd.invoke('agent-create', infos);
    } catch (error) {
      console.error('创建 Agent 失败:', error);
      throw error;
    }
  }

  /**
   * 更新 Agent 信息
   */
  static async updateAgent(id: string, data: Partial<Omit<AgentInfos, 'id'>>): Promise<void> {
    try {
      await cmd.invoke('agent-update', id, data);
    } catch (error) {
      console.error('更新 Agent 失败:', error);
      throw error;
    }
  }

  /**
   * 删除 Agent
   */
  static async deleteAgent(id: string): Promise<void> {
    try {
      await cmd.invoke('agent-delete', id);
    } catch (error) {
      console.error('删除 Agent 失败:', error);
      throw error;
    }
  }

  /**
   * 与 Agent 聊天
   */
  static async chatWithAgent(
    agentId: string, 
    message: string, 
    options?: AgentChatOptions
  ): Promise<any> {
    try {
      return await cmd.invoke('agent-chat', agentId, message, options);
    } catch (error) {
      console.error('Agent 聊天失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前激活的 Agent
   */
  static async getCurrentAgent(): Promise<AgentInfos | null> {
    try {
      return await cmd.invoke('agent-get-current');
    } catch (error) {
      console.error('获取当前 Agent 失败:', error);
      throw error;
    }
  }

  /**
   * 停止当前 Agent
   */
  static async stopAgent(): Promise<void> {
    try {
      await cmd.invoke('agent-stop');
    } catch (error) {
      console.error('停止 Agent 失败:', error);
      throw error;
    }
  }

  /**
   * 关闭当前 Agent
   */
  static async closeAgent(): Promise<void> {
    try {
      await cmd.invoke('agent-close');
    } catch (error) {
      console.error('关闭 Agent 失败:', error);
      throw error;
    }
  }
}