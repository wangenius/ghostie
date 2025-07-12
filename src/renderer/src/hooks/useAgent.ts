import { useState, useEffect, useCallback } from "react";
import { cmd } from "../utils/shell";
import { AgentInfos, AgentChatOptions, ChatMessage, ChatSession } from "../../../common/types/agent";

/**
 * Agent 管理 Hook
 */
export const useAgent = () => {
  const [agents, setAgents] = useState<Record<string, AgentInfos>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取 Agent 列表
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const agentList = await cmd.invoke<Record<string, AgentInfos>>("agent-list");
      setAgents(agentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取 Agent 列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建 Agent
  const createAgent = useCallback(async (infos?: Partial<AgentInfos>) => {
    try {
      setLoading(true);
      setError(null);
      const newAgent = await cmd.invoke<AgentInfos>("agent-create", infos);
      setAgents(prev => ({ ...prev, [newAgent.id]: newAgent }));
      return newAgent;
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建 Agent 失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 根据 ID 获取 Agent
  const getAgentById = useCallback(async (id: string) => {
    try {
      const agent = await cmd.invoke<AgentInfos | null>("agent-get-by-id", id);
      return agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取 Agent 失败");
      return null;
    }
  }, []);

  // 更新 Agent
  const updateAgent = useCallback(async (id: string, data: Partial<Omit<AgentInfos, "id">>) => {
    try {
      setLoading(true);
      setError(null);
      await cmd.invoke("agent-update", id, data);
      setAgents(prev => ({
        ...prev,
        [id]: { ...prev[id], ...data }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新 Agent 失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除 Agent
  const deleteAgent = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await cmd.invoke("agent-delete", id);
      setAgents(prev => {
        const newAgents = { ...prev };
        delete newAgents[id];
        return newAgents;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除 Agent 失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化时获取 Agent 列表
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    getAgentById,
    updateAgent,
    deleteAgent,
  };
};

/**
 * Agent 聊天 Hook
 */
export const useAgentChat = (agentId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 发送消息
  const sendMessage = useCallback(async (message: string, options?: AgentChatOptions) => {
    if (!agentId) {
      setError("Agent ID 未指定");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: Date.now(),
        images: options?.images,
      };
      setMessages(prev => [...prev, userMessage]);

      // 调用 Agent 聊天
      const response = await cmd.invoke("agent-chat", agentId, message, options);
      
      // 添加 AI 回复
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response?.content || response || "没有收到回复",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);

      return aiMessage;
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送消息失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 停止 Agent
  const stopAgent = useCallback(async () => {
    try {
      await cmd.invoke("agent-stop");
    } catch (err) {
      console.error("停止 Agent 失败:", err);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    stopAgent,
  };
};

/**
 * 当前 Agent Hook
 */
export const useCurrentAgent = () => {
  const [currentAgent, setCurrentAgent] = useState<AgentInfos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前 Agent
  const fetchCurrentAgent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const agent = await cmd.invoke<AgentInfos>("agent-get-current");
      setCurrentAgent(agent);
      return agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取当前 Agent 失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 关闭当前 Agent
  const closeCurrentAgent = useCallback(async () => {
    try {
      await cmd.invoke("agent-close");
      setCurrentAgent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "关闭 Agent 失败");
      throw err;
    }
  }, []);

  return {
    currentAgent,
    loading,
    error,
    fetchCurrentAgent,
    closeCurrentAgent,
  };
}; 