import { BotProps } from "@/common/types/bot";
import { Bot } from "@/services/bot/bot";
import { Echo } from "echo-state";

interface ChatState {
  /* 是否正在聊天 */
  isActive: boolean;
  /* 当前输入 */
  currentInput: string;
  /* 是否正在加载 */
  isLoading: boolean;
  /* 当前选中的助手索引 */
  selectedBotIndex: number;
  /* 当前选中的助手 */
  currentBot?: Bot;
}

export class ChatManager {
  private static state = new Echo<ChatState>({
    isActive: false,
    currentInput: "",
    isLoading: false,
    selectedBotIndex: 0,
    currentBot: undefined,
  });

  static useChat() {
    const state = this.state.use();

    return {
      ...state,
      updateInput: (input: string) => this.state.set({ currentInput: input }),
      setLoading: (loading: boolean) => this.state.set({ isLoading: loading }),
      selectBot: (index: number) => this.state.set({ selectedBotIndex: index }),
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
