import { BotProps } from "@/common/types/bot";
import { Bot } from "@/services/bot/Bot";
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
  currentBot?: Bot;
}

/* 聊天管理器 */
export class ChatManager {
  /* 状态 */
  private static state = new Echo<ChatState>({
    isActive: false,
    currentInput: "",
    isLoading: false,
    currentBot: undefined,
  });

  static useChat() {
    const state = this.state.use();

    return {
      ...state,
      updateInput: (input: string) => this.state.set({ currentInput: input }),
      setLoading: (loading: boolean) => this.state.set({ isLoading: loading }),
      startChat: (bot: BotProps) => {
        const newBot = new Bot(bot);
        this.state.set({
          isActive: true,
          currentBot: newBot,
        });
        return newBot;
      },
      endChat: () => {
        this.state.set({
          isActive: false,
          currentBot: undefined,
          currentInput: "",
        });
      },
    };
  }
}
