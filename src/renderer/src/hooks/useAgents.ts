import { useState, useEffect, useCallback } from 'react';
import { AgentInfos } from '@common/types/agent';
import { AgentService } from '@/services/agentService';

export const useAgents = () => {
  const [agents, setAgents] = useState<Record<string, AgentInfos>>({});
  const [currentAgent, setCurrentAgent] = useState<AgentInfos | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 Agent 列表
  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const agentList = await AgentService.getAgentList();
      setAgents(agentList);
    } catch (err) {
      console.error('加载 Agent 列表失败:', err);
      setError('加载 Agent 列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 创建 Agent
  const createAgent = useCallback(async (data: Partial<AgentInfos>) => {
    try {
      setIsLoading(true);
      setError(null);
      const newAgent = await AgentService.createAgent(data);
      await loadAgents(); // 重新加载列表
      return newAgent;
    } catch (err) {
      console.error('创建 Agent 失败:', err);
      setError('创建 Agent 失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadAgents]);

  // 更新 Agent
  const updateAgent = useCallback(async (id: string, data: Partial<Omit<AgentInfos, 'id'>>) => {
    try {
      setIsLoading(true);
      setError(null);
      await AgentService.updateAgent(id, data);
      await loadAgents(); // 重新加载列表
      
      // 如果更新的是当前 Agent，也更新当前 Agent
      if (currentAgent?.id === id) {
        const updatedAgent = await AgentService.getAgentById(id);
        setCurrentAgent(updatedAgent);
      }
    } catch (err) {
      console.error('更新 Agent 失败:', err);
      setError('更新 Agent 失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadAgents, currentAgent?.id]);

  // 删除 Agent
  const deleteAgent = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await AgentService.deleteAgent(id);
      await loadAgents(); // 重新加载列表
      
      // 如果删除的是当前 Agent，清除当前 Agent
      if (currentAgent?.id === id) {
        setCurrentAgent(null);
      }
    } catch (err) {
      console.error('删除 Agent 失败:', err);
      setError('删除 Agent 失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadAgents, currentAgent?.id]);

  // 选择 Agent
  const selectAgent = useCallback((agent: AgentInfos | null) => {
    setCurrentAgent(agent);
  }, []);

  // 初始化加载
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    agents: Object.values(agents),
    agentsMap: agents,
    currentAgent,
    isLoading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    selectAgent,
  };
}; 