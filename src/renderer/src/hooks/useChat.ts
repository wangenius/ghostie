import { useState, useCallback } from 'react';
import { ChatMessage, AgentInfos } from '@common/types/agent';
import { AgentService } from '@/services/agentService';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [inputValue, setInputValue] = useState('');

  // 添加消息
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (agent: AgentInfos, content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    // 添加用户消息
    addMessage(userMessage);
    setInputValue('');

    try {
      setIsStreaming(true);
      setStreamingMessage('');

      // 调用后端 Agent 聊天
      const response = await AgentService.chatWithAgent(agent.id, content.trim());

      // 处理响应
      if (response && response.content) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };
        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 添加错误消息
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，处理您的消息时出现了错误。请稍后重试。',
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  }, [addMessage, isStreaming]);

  // 停止生成
  const stopGeneration = useCallback(async () => {
    try {
      await AgentService.stopAgent();
      setIsStreaming(false);
      setStreamingMessage('');
    } catch (error) {
      console.error('停止生成失败:', error);
    }
  }, []);

  return {
    messages,
    isStreaming,
    streamingMessage,
    inputValue,
    setInputValue,
    addMessage,
    clearMessages,
    sendMessage,
    stopGeneration,
  };
}; 