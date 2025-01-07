import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Message } from "../types";
import { Echo } from "../utils/Echo";

interface ChatState {
  messages: Message[];
  loading: boolean;
  currentId: string | null;
  history: ChatHistory[];
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
  messages: Message[];
}

interface ChatError extends Error {
  code?: string;
  details?: unknown;
}

export class ChatManager {
  static state = new Echo<ChatState>({
    messages: [],
    loading: false,
    currentId: null,
    history: [],
  });

  static use = ChatManager.state.use.bind(ChatManager.state);

  static updateMessage = (chunk: string) => {
    ChatManager.state.set((prev) => {
      const messages = [...prev.messages];
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return prev;

      messages[messages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + chunk,
      };

      return { ...prev, messages };
    }, true);
  };

  static async handleChatComplete() {
    ChatManager.state.set((prev) => ({ ...prev, loading: false }));

    const currentState = ChatManager.state.current;
    if (!currentState.currentId || currentState.messages.length < 2) return;

    const userMessages = currentState.messages.filter(
      (msg: Message) => msg.role === "user"
    );
    if (userMessages.length === 0) return;

    const title = userMessages[0].content.slice(0, 50) + "...";
    const lastMessage = currentState.messages[currentState.messages.length - 1];
    const preview = lastMessage?.content.slice(0, 100) + "..." || "";

    try {
      await invoke("update_chat_history", {
        id: currentState.currentId,
        title,
        preview,
        messages: currentState.messages,
      });
    } catch (error) {
      console.error("更新聊天历史失败:", error);
    }
  }

  static async createChat(): Promise<string> {
    try {
      const id = Date.now().toString();
      ChatManager.state.set(
        {
          history: [],
          currentId: id,
          messages: [],
          loading: false,
        },
        true
      );
      return id;
    } catch (error) {
      console.error("创建聊天失败:", error);
      throw error;
    }
  }

  static async sendMessage(message: string, bot: string) {
    if (!message.trim()) {
      throw new Error("消息不能为空");
    }

    const userMessage: Message = { role: "user", content: message };
    const assistantMessage: Message = { role: "assistant", content: "" };

    try {
      const messages = [...ChatManager.state.current.messages, userMessage];
      ChatManager.state.set((prev) => ({
        ...prev,
        loading: true,
        messages: [...messages, assistantMessage],
      }));

      await ChatManager.setupListeners();

      await invoke("chat", {
        messages: messages,
        bot,
      });
    } catch (error) {
      const chatError = error as ChatError;
      console.error("发送消息失败:", chatError);

      ChatManager.state.set((prev) => ({
        ...prev,
        loading: false,
        messages: prev.messages.slice(0, -2).concat({
          role: "assistant",
          content: `错误: ${chatError.message || "发送消息失败"}`,
        }),
      }));
    }
  }

  static clearMessages() {
    ChatManager.state.set((prev) => ({
      ...prev,
      messages: [],
      loading: false,
      currentId: null,
    }));
  }

  static currentListeners: UnlistenFn[] = [];

  static async cleanupListeners() {
    for (const unlisten of ChatManager.currentListeners) {
      await unlisten();
    }
    ChatManager.currentListeners = [];
  }

  static async setupListeners() {
    try {
      // 清理现有的监听器
      await ChatManager.cleanupListeners();

      console.log("设置新的聊天监听器");

      const chatResponse = await listen("chat-response", (event) => {
        console.log("收到聊天响应:", event.payload);
        ChatManager.updateMessage(event.payload as string);
      });

      const chatComplete = await listen("chat-complete", () => {
        console.log("聊天完成");
        ChatManager.handleChatComplete();
      });

      ChatManager.currentListeners.push(chatResponse, chatComplete);
      console.log("聊天监听器设置完成");
    } catch (error) {
      console.error("设置监听器失败:", error);
      throw error;
    }
  }
}
