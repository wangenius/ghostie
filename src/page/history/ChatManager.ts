import { AgentProps } from "@/agent/types/agent";
import { Agent } from "@/agent/Agent";
import { Echo } from "echo-state";

/* 聊天状态 */
interface ChatState {
  /* 是否正在聊天 */
  isActive: boolean;
  /* 当前输入 */
  currentInput: string;
  /* 是否正在加载 */
  isLoading: boolean;
  /* 当前选中的助手 */
  currentAgent?: Agent;
}

/* 聊天管理器 */
export class ChatManager {
  /* 状态 */
  private static state = new Echo<ChatState>({
    isActive: false,
    currentInput: "",
    isLoading: false,
    currentAgent: undefined,
  });

  static setCurrentAgent(agent: Agent) {
    this.state.set({ currentAgent: agent });
  }
  static setActive(active: boolean) {
    this.state.set({ isActive: active });
  }

  static useChat() {
    const state = this.state.use();

    return {
      ...state,
      updateInput: (input: string) => this.state.set({ currentInput: input }),
      setLoading: (loading: boolean) => this.state.set({ isLoading: loading }),
      startChat: async (agent: AgentProps) => {
        const newAgent = await Agent.get(agent.id);
        this.state.set({
          isActive: true,
          currentAgent: newAgent,
        });
        return newAgent;
      },
      endChat: () => {
        this.state.current.currentAgent?.stop();
        this.state.set({
          isActive: false,
          currentAgent: undefined,
          currentInput: "",
        });
      },
    };
  }
}
