# Ghostie Zustand 状态管理方案

## 1. 依赖安装

```bash
npm install zustand
```

## 2. 核心状态 Store

### 2.1 主应用状态 (`src/renderer/src/store/useAppStore.ts`)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  loading?: boolean;
  error?: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  system: string;
  engine?: string;
  version: string;
  models?: any;
  tools: any[];
  mcps: any[];
  knowledges: string[];
  workflows: string[];
  agents: string[];
  skills: string[];
  configs?: {
    temperature?: number;
  };
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  alwaysOnTop: boolean;
  autoStart: boolean;
  language: string;
  shortcuts: {
    toggleWindow: string;
    newChat: string;
  };
}

interface AppState {
  // 核心状态
  currentAgent: Agent | null;
  chatMessages: ChatMessage[];
  agents: Agent[];
  settings: AppSettings;
  
  // UI 状态
  isLoading: boolean;
  sidebarCollapsed: boolean;
  currentView: 'chat' | 'agents' | 'settings';
  
  // Actions - Agent 管理
  setCurrentAgent: (agent: Agent | null) => void;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  
  // Actions - 聊天管理
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  clearChatMessages: () => void;
  
  // Actions - UI 控制
  setLoading: (loading: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentView: (view: 'chat' | 'agents' | 'settings') => void;
  
  // Actions - 设置管理
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Actions - 数据初始化
  initializeApp: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  alwaysOnTop: false,
  autoStart: false,
  language: 'zh-CN',
  shortcuts: {
    toggleWindow: 'Alt+Space',
    newChat: 'Ctrl+N',
  },
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      currentAgent: null,
      chatMessages: [],
      agents: [],
      settings: defaultSettings,
      isLoading: false,
      sidebarCollapsed: false,
      currentView: 'chat',
      
      // Agent 管理
      setCurrentAgent: (agent) => {
        set((state) => {
          state.currentAgent = agent;
          // 切换 Agent 时清空聊天记录
          state.chatMessages = [];
        });
      },
      
      setAgents: (agents) => {
        set((state) => {
          state.agents = agents;
        });
      },
      
      addAgent: (agent) => {
        set((state) => {
          state.agents.push(agent);
        });
      },
      
      updateAgent: (id, updates) => {
        set((state) => {
          const index = state.agents.findIndex(a => a.id === id);
          if (index !== -1) {
            Object.assign(state.agents[index], updates);
          }
          // 如果更新的是当前 Agent，也更新当前 Agent
          if (state.currentAgent?.id === id) {
            Object.assign(state.currentAgent, updates);
          }
        });
      },
      
      removeAgent: (id) => {
        set((state) => {
          state.agents = state.agents.filter(a => a.id !== id);
          // 如果删除的是当前 Agent，清空当前 Agent
          if (state.currentAgent?.id === id) {
            state.currentAgent = null;
            state.chatMessages = [];
          }
        });
      },
      
      // 聊天管理
      addChatMessage: (message) => {
        set((state) => {
          state.chatMessages.push(message);
        });
      },
      
      updateChatMessage: (id, updates) => {
        set((state) => {
          const index = state.chatMessages.findIndex(m => m.id === id);
          if (index !== -1) {
            Object.assign(state.chatMessages[index], updates);
          }
        });
      },
      
      setChatMessages: (messages) => {
        set((state) => {
          state.chatMessages = messages;
        });
      },
      
      clearChatMessages: () => {
        set((state) => {
          state.chatMessages = [];
        });
      },
      
      // UI 控制
      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },
      
      setSidebarCollapsed: (collapsed) => {
        set((state) => {
          state.sidebarCollapsed = collapsed;
        });
      },
      
      setCurrentView: (view) => {
        set((state) => {
          state.currentView = view;
        });
      },
      
      // 设置管理
      updateSettings: (newSettings) => {
        set((state) => {
          Object.assign(state.settings, newSettings);
        });
      },
      
      // 数据初始化
      initializeApp: async () => {
        try {
          set((state) => {
            state.isLoading = true;
          });
          
          // 加载 Agents
          const agents = await (window as any).shell.invoke('agent-list');
          
          set((state) => {
            state.agents = Object.values(agents) as Agent[];
            state.isLoading = false;
          });
          
          // 如果没有当前 Agent 且有可用 Agent，设置第一个为当前
          const currentState = get();
          if (!currentState.currentAgent && currentState.agents.length > 0) {
            get().setCurrentAgent(currentState.agents[0]);
          }
        } catch (error) {
          console.error('初始化应用失败:', error);
          set((state) => {
            state.isLoading = false;
          });
        }
      },
    })),
    {
      name: 'ghostie-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
        currentView: state.currentView,
        // 不持久化敏感数据
      }),
    }
  )
);
```

### 2.2 聊天状态 Store (`src/renderer/src/store/useChatStore.ts`)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ChatState {
  // 当前输入
  currentInput: string;
  isTyping: boolean;
  
  // 流式响应状态
  streamingMessageId: string | null;
  
  // Actions
  setCurrentInput: (input: string) => void;
  setIsTyping: (typing: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  
  // 聊天操作
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    currentInput: '',
    isTyping: false,
    streamingMessageId: null,
    
    setCurrentInput: (input) => {
      set((state) => {
        state.currentInput = input;
      });
    },
    
    setIsTyping: (typing) => {
      set((state) => {
        state.isTyping = typing;
      });
    },
    
    setStreamingMessageId: (id) => {
      set((state) => {
        state.streamingMessageId = id;
      });
    },
    
    sendMessage: async (content) => {
      const { useAppStore } = await import('./useAppStore');
      const { currentAgent, addChatMessage, updateChatMessage } = useAppStore.getState();
      
      if (!currentAgent) {
        console.error('没有选择 Agent');
        return;
      }
      
      try {
        // 添加用户消息
        const userMessage = {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content,
          timestamp: Date.now(),
        };
        addChatMessage(userMessage);
        
        // 添加 AI 消息占位符
        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage = {
          id: aiMessageId,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          loading: true,
        };
        addChatMessage(aiMessage);
        
        set((state) => {
          state.streamingMessageId = aiMessageId;
          state.currentInput = '';
        });
        
        // 调用后端 Agent
        const response = await (window as any).shell.invoke(
          'agent-chat',
          currentAgent.id,
          content
        );
        
        // 更新 AI 消息
        updateChatMessage(aiMessageId, {
          content: response.content || '抱歉，我无法回答这个问题。',
          loading: false,
        });
        
      } catch (error) {
        console.error('发送消息失败:', error);
        
        // 更新错误状态
        if (get().streamingMessageId) {
          updateChatMessage(get().streamingMessageId!, {
            content: '抱歉，发送消息时出现错误。',
            loading: false,
            error: error instanceof Error ? error.message : '未知错误',
          });
        }
      } finally {
        set((state) => {
          state.streamingMessageId = null;
        });
      }
    },
    
    stopStreaming: () => {
      // TODO: 实现停止流式响应
      set((state) => {
        state.streamingMessageId = null;
      });
    },
  }))
);
```

## 3. 选择器 Hooks (性能优化)

### 3.1 应用状态选择器 (`src/renderer/src/store/selectors.ts`)

```typescript
import { useAppStore } from './useAppStore';
import { useChatStore } from './useChatStore';

// App 状态选择器
export const useCurrentAgent = () => useAppStore((state) => state.currentAgent);
export const useAgents = () => useAppStore((state) => state.agents);
export const useChatMessages = () => useAppStore((state) => state.chatMessages);
export const useAppSettings = () => useAppStore((state) => state.settings);
export const useAppLoading = () => useAppStore((state) => state.isLoading);
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useCurrentView = () => useAppStore((state) => state.currentView);

// Chat 状态选择器
export const useCurrentInput = () => useChatStore((state) => state.currentInput);
export const useIsTyping = () => useChatStore((state) => state.isTyping);
export const useStreamingMessageId = () => useChatStore((state) => state.streamingMessageId);

// 组合选择器
export const useChatState = () => {
  const messages = useChatMessages();
  const currentInput = useCurrentInput();
  const isTyping = useIsTyping();
  const streamingMessageId = useStreamingMessageId();
  
  return {
    messages,
    currentInput,
    isTyping,
    streamingMessageId,
    hasMessages: messages.length > 0,
    lastMessage: messages[messages.length - 1],
  };
};

export const useAgentState = () => {
  const currentAgent = useCurrentAgent();
  const agents = useAgents();
  
  return {
    currentAgent,
    agents,
    hasAgents: agents.length > 0,
    hasCurrentAgent: !!currentAgent,
  };
};
```

## 4. 使用示例

### 4.1 在组件中使用

```typescript
// ChatInterface.tsx
import React from 'react';
import { useChatState, useAgentState } from '@/store/selectors';
import { useChatStore } from '@/store/useChatStore';

export const ChatInterface = () => {
  const { messages, currentInput, isTyping } = useChatState();
  const { currentAgent } = useAgentState();
  const { setCurrentInput, sendMessage } = useChatStore();
  
  const handleSend = async () => {
    if (!currentInput.trim() || !currentAgent) return;
    await sendMessage(currentInput);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={currentAgent ? `与 ${currentAgent.name} 对话...` : '请先选择一个 Agent'}
            disabled={!currentAgent || isTyping}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={!currentInput.trim() || !currentAgent || isTyping}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 4.2 应用初始化

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export const App = () => {
  const initializeApp = useAppStore((state) => state.initializeApp);
  
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);
  
  return (
    <div className="h-screen flex">
      {/* 应用内容 */}
    </div>
  );
};
```

## 5. 优势总结

### 5.1 Zustand 相比 MobX 的优势

1. **更轻量**: 包体积更小，无需装饰器
2. **更简单**: API 更直观，学习成本低
3. **更现代**: 基于 hooks，与 React 生态集成更好
4. **TypeScript 友好**: 更好的类型推断和支持
5. **性能优化**: 内置选择器，避免不必要的重渲染

### 5.2 架构优势

1. **模块化**: 按功能拆分不同的 store
2. **类型安全**: 完整的 TypeScript 类型定义
3. **持久化**: 自动保存用户设置和状态
4. **性能优化**: 使用选择器避免不必要的渲染
5. **可测试**: 状态逻辑与组件分离，易于测试

这个方案提供了完整的状态管理解决方案，既保持了代码的简洁性，又提供了强大的功能和良好的性能。 