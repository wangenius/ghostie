import {
  AgentChatOptions,
  AgentProps
} from "@common/types/agent";
import { MemoryMessage, ChatSession } from "@common/types/MessageType";
import { useCallback, useEffect, useState } from "react";
import { cmd } from "../utils/shell";

/**
 * Agent 管理 Hook
 */
export const useAgent = () => {
  const [agents, setAgents] = useState<Record<string, AgentProps>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取 Agent 列表
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const agentList =
        await cmd.invoke<Record<string, AgentProps>>("agent-list");
      setAgents(agentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取 Agent 列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建 Agent
  const createAgent = useCallback(async (infos?: Partial<AgentProps>) => {
    try {
      setLoading(true);
      setError(null);
      const newAgent = await cmd.invoke<AgentProps>("agent-create", infos);
      // 创建后立即刷新列表以确保同步
      await fetchAgents();
      return newAgent;
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建 Agent 失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAgents]);

  // 根据 ID 获取 Agent
  const getAgentById = useCallback(async (id: string) => {
    try {
      const agent = await cmd.invoke<AgentProps | null>("agent-get-by-id", id);
      // 如果获取成功，更新本地状态中的对应Agent
      if (agent) {
        setAgents((prev) => ({ ...prev, [agent.id]: agent }));
      }
      return agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取 Agent 失败");
      return null;
    }
  }, []);

  // 更新 Agent
  const updateAgent = useCallback(
    async (id: string, data: Partial<Omit<AgentProps, "id">>) => {
      try {
        setLoading(true);
        setError(null);
        
        // 乐观更新：立即更新本地状态
        setAgents(prev => ({
          ...prev,
          [id]: { ...prev[id], ...data }
        }));
        
        await cmd.invoke("agent-update", id, data);
        // 不再需要手动调用fetchAgents，因为后端会发送事件
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新 Agent 失败");
        // 如果更新失败，重新获取数据以恢复正确状态
        await fetchAgents();
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchAgents],
  );

  // 删除 Agent
  const deleteAgent = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await cmd.invoke("agent-delete", id);
      // 删除后立即刷新列表以确保同步
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除 Agent 失败");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAgents]);

  // 初始化时获取 Agent 列表
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 监听Agent事件和定期刷新
   useEffect(() => {
     // 监听Agent事件
     const handleAgentUpdated = (agentInfo: AgentProps) => {
       setAgents(prev => ({
         ...prev,
         [agentInfo.id]: agentInfo
       }));
     };
 
     const handleAgentCreated = (agentInfo: AgentProps) => {
       setAgents(prev => ({
         ...prev,
         [agentInfo.id]: agentInfo
       }));
     };
 
     const handleAgentDeleted = ({ id }: { id: string }) => {
       setAgents(prev => {
         const newAgents = { ...prev };
         delete newAgents[id];
         return newAgents;
       });
     };
 
     const handleAgentsRefreshed = (newAgents: Record<string, AgentProps>) => {
       setAgents(newAgents);
     };
 
     // 注册事件监听器并保存取消函数
     const unsubscribeAgentUpdated = cmd.on('agent-updated', handleAgentUpdated);
     const unsubscribeAgentCreated = cmd.on('agent-created', handleAgentCreated);
     const unsubscribeAgentDeleted = cmd.on('agent-deleted', handleAgentDeleted);
     const unsubscribeAgentsRefreshed = cmd.on('agents-refreshed', handleAgentsRefreshed);
     
     // 每30秒刷新一次作为备用机制
     const interval = setInterval(() => {
       fetchAgents();
     }, 30000);
 
     return () => {
       clearInterval(interval);
       // 清理事件监听器
       if (typeof unsubscribeAgentUpdated === 'function') unsubscribeAgentUpdated();
       if (typeof unsubscribeAgentCreated === 'function') unsubscribeAgentCreated();
       if (typeof unsubscribeAgentDeleted === 'function') unsubscribeAgentDeleted();
       if (typeof unsubscribeAgentsRefreshed === 'function') unsubscribeAgentsRefreshed();
     };
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
  const [messages, setMessages] = useState<(MemoryMessage & {
    loading?: boolean;
    error?: string;
    reasoner?: string;
    tool_calls?: any;
    images?: string[];
    hidden?: boolean;
    tool_call_id?: string;
    tool_loading?: boolean;
  })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 当agentId变化时，重置聊天状态并尝试恢复最后的会话
  useEffect(() => {
    setMessages([]);
    setCurrentSessionId(null);
    setError(null);

    // 尝试恢复最后的会话
    const restoreLastSession = async () => {
      try {
        const lastSessionId = localStorage.getItem(`lastSessionId_${agentId}`);
        if (lastSessionId) {
          const sessionMessages = await cmd.invoke("chat-history-load-session", lastSessionId);
          if (sessionMessages && sessionMessages.length > 0) {
            setMessages(sessionMessages);
            setCurrentSessionId(lastSessionId);
          }
        }
      } catch (error) {
        console.warn("恢复最后会话失败:", error);
      }
    };

    if (agentId) {
      restoreLastSession();
    }
  }, [agentId]);

  // 发送消息
  const sendMessage = useCallback(
    async (message: string, options?: AgentChatOptions) => {
      if (!agentId) {
        setError("Agent ID 未指定");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 检查后端连接状态
        try {
          await cmd.invoke("agent-get-by-id", agentId);
        } catch (err) {
          throw new Error("无法连接到后端服务，请检查应用状态");
        }

        // 添加用户消息
        const userMessage: MemoryMessage & {
          loading?: boolean;
          error?: string;
        } = {
          from: "user",
          content: [
            {
              type: "text",
              content: message,
            },
          ],
          created_at: Date.now(),
          updated_at: Date.now(), 
        };
        setMessages((prev) => [...prev, userMessage]);

        // 如果没有当前会话，创建新会话
        let sessionId = currentSessionId;
        if (!sessionId) {
          try {
            const session = await cmd.invoke("chat-history-create-session", agentId, userMessage);
            sessionId = session.id;
            setCurrentSessionId(sessionId);
            // 保存最后使用的会话ID
            if (sessionId) {
              localStorage.setItem(`lastSessionId_${agentId}`, sessionId);
            }
          } catch (err) {
            console.warn("创建聊天会话失败，继续使用内存模式:", err);
            // 设置一个临时的错误状态，但不阻止聊天继续
            setError("聊天会话创建失败，消息将不会被保存");
            // 3秒后清除错误状态
            setTimeout(() => setError(null), 3000);
          }
        } else {
          // 将用户消息添加到现有会话
          try {
            await cmd.invoke("chat-history-add-message", sessionId, userMessage);
          } catch (err) {
            console.warn("保存用户消息到会话失败:", err);
            setError("消息保存失败，但聊天可以继续");
            setTimeout(() => setError(null), 3000);
          }
        }

        // 添加一个临时的加载消息
        const loadingMessage: MemoryMessage & {
          loading?: boolean;
          error?: string;
          reasoner?: string;
        } = {
          from: "agent",
          content: [
            {
              type: "text",
              content: "",
            },
          ],
          created_at: Date.now(),
          updated_at: Date.now(),
          loading: true,
        };
        setMessages((prev) => [...prev, loadingMessage]);

        // 调用 Agent 聊天
        const response = await cmd.invoke(
          "agent-chat",
          agentId,
          message,
          options,
        );

        // 处理 MessageItem 响应
        let agentMessage: MemoryMessage;
        let messageError: string | undefined;

        if (response && typeof response === "object" && response.from === "agent") {
          // 如果响应是完整的 MemoryMessage 对象，直接使用
          agentMessage = response as MemoryMessage;
          messageError = response.error;
        } else {
          // 如果响应是其他格式，创建标准的 agent 消息
          let content = "";
          if (response && typeof response === "object") {
            if (response.error) {
              messageError = response.error;
              content = "处理消息时发生错误";
            } else {
              content = response.content || "没有收到回复";
            }
          } else {
            content = response || "没有收到回复";
          }
          
          agentMessage = {
            from: "agent",
            content: [
              {
                type: "text",
                content: content,
              },
            ],
            created_at: Date.now(),
            updated_at: Date.now(),
          };
        }

        // 更新最后一条消息（移除loading状态并添加内容）
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.from === "agent" && lastMessage.loading) {
            // 确保 agentMessage 是 AgentMemoryMessage 类型
            if (agentMessage.from === "agent") {
              lastMessage.content = agentMessage.content;
              lastMessage.loading = false;
              lastMessage.error = messageError;
              if ('created_at' in agentMessage && 'updated_at' in agentMessage) {
                lastMessage.created_at = agentMessage.created_at;
                lastMessage.updated_at = agentMessage.updated_at;
              } else {
                lastMessage.updated_at = Date.now();
              }
            }
          }
          return newMessages;
        });

        // 创建最终的AI消息用于返回
        const aiMessage: MemoryMessage & {
          loading?: boolean;
          error?: string;
          reasoner?: string;
        } = {
          ...agentMessage,
          error: messageError,
        };

        // 消息已经通过状态更新添加，不需要再次添加

        // 将AI回复添加到会话
        if (sessionId) {
          try {
            await cmd.invoke("chat-history-add-message", sessionId, aiMessage);
          } catch (err) {
            console.warn("保存AI回复到会话失败:", err);
          }
        }

        // 触发消息更新事件，通知其他组件刷新
        triggerMessageUpdate(agentId);

        return aiMessage;
      } catch (err) {
        setError(err instanceof Error ? err.message : "发送消息失败");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [agentId, currentSessionId],
  );

  // 清除消息
  const clearMessages = useCallback(async () => {
    setMessages([]);
    setCurrentSessionId(null);
    // 清除最后使用的会话ID
    localStorage.removeItem(`lastSessionId_${agentId}`);
    
    // 重置后端Agent的上下文
    try {
      await cmd.invoke("agent-reset-context", agentId);
      console.log("Agent上下文已重置");
    } catch (error) {
      console.warn("重置Agent上下文失败:", error);
    }
  }, [agentId]);

  // 停止Agent
  const stopAgent = useCallback(async () => {
    try {
      await cmd.invoke("agent-stop", agentId);
    } catch (err) {
      console.error("停止Agent失败:", err);
    }
  }, [agentId]);

  // 诊断Agent配置问题
  const diagnoseAgent = useCallback(async () => {
    try {
      const result = await cmd.invoke("agent-diagnose", agentId) as {
        status: 'ok' | 'warning' | 'error';
        issues: string[];
        recommendations: string[];
      };
      return result;
    } catch (err) {
      console.error("诊断Agent失败:", err);
      return {
        status: 'error' as const,
        issues: ['诊断功能调用失败'],
        recommendations: ['请检查Agent是否正常运行'],
      };
    }
  }, [agentId]);

  // 加载聊天会话
  const loadChatSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const sessionMessages = await cmd.invoke("chat-history-load-session", sessionId);
      setMessages(sessionMessages);
      setCurrentSessionId(sessionId);
      // 保存最后使用的会话ID
      localStorage.setItem(`lastSessionId_${agentId}`, sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载聊天会话失败");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // 获取聊天会话列表
  const getChatSessions = useCallback(async () => {
    try {
      return await cmd.invoke("chat-history-get-sessions", agentId);
    } catch (err) {
      console.error("获取聊天会话列表失败:", err);
      return [];
    }
  }, [agentId]);

  // 删除聊天会话
  const deleteChatSession = useCallback(async (sessionId: string) => {
    try {
      await cmd.invoke("chat-history-delete-session", sessionId);
      // 如果删除的是当前会话，清空消息
      if (sessionId === currentSessionId) {
        await clearMessages();
      }
    } catch (err) {
      console.error("删除聊天会话失败:", err);
      throw err;
    }
  }, [currentSessionId, clearMessages]);

  // 删除所有聊天会话
  const deleteAllChatSessions = useCallback(async () => {
    try {
      await cmd.invoke("chat-history-delete-sessions-by-agent", agentId);
      await clearMessages();
    } catch (err) {
      console.error("删除所有聊天会话失败:", err);
      throw err;
    }
  }, [agentId, clearMessages]);

  return {
    messages,
    loading,
    error,
    currentSessionId,
    sendMessage,
    clearMessages,
    loadChatSession,
    getChatSessions,
    deleteChatSession,
    deleteAllChatSessions,
    stopAgent,
    diagnoseAgent,
  };
};

/**
 * 当前 Agent Hook
 */
export const useCurrentAgent = () => {
  const [currentAgent, setCurrentAgent] = useState<AgentProps | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前 Agent
  const fetchCurrentAgent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const agent = await cmd.invoke<AgentProps>("agent-get-current");
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

// 全局消息更新事件
const messageUpdateEvents = new Map<string, Set<() => void>>();

// 触发特定agent的消息更新事件
export const triggerMessageUpdate = (agentId: string) => {
  const listeners = messageUpdateEvents.get(agentId);
  if (listeners) {
    listeners.forEach(listener => listener());
  }
};

/**
 * 获取Agent最近消息的Hook
 */
export const useAgentLatestMessage = (agentId: string) => {
  const [latestMessage, setLatestMessage] = useState<MemoryMessage | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLatestMessage = useCallback(async () => {
    if (!agentId) {
      setLatestMessage(null);
      return;
    }

    try {
      setLoading(true);
      // 获取该agent的所有会话
      const sessions = await cmd.invoke<ChatSession[]>("chat-history-get-sessions", agentId);
      
      if (sessions && sessions.length > 0) {
        // 按更新时间排序，获取最新的会话
        const latestSession = sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        
        if (latestSession && latestSession.messages && latestSession.messages.length > 0) {
          // 获取该会话的最后一条消息
          const lastMessage = latestSession.messages[latestSession.messages.length - 1];
          setLatestMessage(lastMessage);
        } else {
          setLatestMessage(null);
        }
      } else {
        setLatestMessage(null);
      }
    } catch (error) {
      console.warn(`获取Agent ${agentId} 最近消息失败:`, error);
      setLatestMessage(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchLatestMessage();
    
    // 注册消息更新监听器
    if (!messageUpdateEvents.has(agentId)) {
      messageUpdateEvents.set(agentId, new Set());
    }
    const listeners = messageUpdateEvents.get(agentId)!;
    listeners.add(fetchLatestMessage);
    
    // 清理函数
    return () => {
      listeners.delete(fetchLatestMessage);
      if (listeners.size === 0) {
        messageUpdateEvents.delete(agentId);
      }
    };
  }, [fetchLatestMessage, agentId]);

  return {
    latestMessage,
    loading,
    refetch: fetchLatestMessage,
  };
};
