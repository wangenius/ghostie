import { ChatSession, MemoryMessage } from "@common/types/MessageType";
import { gen } from "@common/generator";
import { UserData } from "./UserData";

// 内存存储
let chatSessions: Record<string, ChatSession> = {};
const CHAT_HISTORY_FILE = "chat_history.json";

const saveToFile = async () => {
  try {
    await UserData.getInstance().save(chatSessions, CHAT_HISTORY_FILE);
  } catch (error) {
    console.error("保存聊天历史失败:", error);
  }
};

// 从文件加载
const loadFromFile = async () => {
  try {
    chatSessions =
      await UserData.getInstance().load<Record<string, ChatSession>>(
        CHAT_HISTORY_FILE,
      );
  } catch (error) {
    console.error("加载聊天历史失败:", error);
    chatSessions = {};
  }
};

export class ChatHistoryManager {
  /** 初始化聊天历史管理器 */
  static async init() {
    await loadFromFile();
  }

  /** 创建新的聊天会话 */
  static async createSession(
    agentId: string,
    firstMessage?: MemoryMessage,
  ): Promise<ChatSession> {
    const messages: MemoryMessage[] = [];
    if (firstMessage) {
      messages.push(firstMessage);
    }

    // 获取消息内容用于标题
    let title = "新对话";
    if (firstMessage) {
      if (firstMessage.from === "user") {
        const textContent = firstMessage.content.find(
          (item) => item.type === "text",
        );
        if (textContent && typeof textContent.content === "string") {
          title = textContent.content.slice(0, 50);
        }
      } else if (firstMessage.from === "agent") {
        const textContent = firstMessage.content.find(
          (item) => item.type === "text",
        );
        if (textContent && typeof textContent.content === "string") {
          title = textContent.content.slice(0, 50);
        }
      } else if (firstMessage.from === "system") {
        title = firstMessage.content.slice(0, 50);
      }
    }

    const session: ChatSession = {
      id: gen.id(),
      agentId,
      title,
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    chatSessions[session.id] = session;
    await saveToFile();
    return session;
  }

  /** 获取Agent的所有会话 */
  static async getSessionsByAgent(agentId: string): Promise<ChatSession[]> {
    const sessions = Object.values(chatSessions)
      .filter((session) => session.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return sessions;
  }

  /** 获取特定会话 */
  static async getSession(sessionId: string): Promise<ChatSession | null> {
    return chatSessions[sessionId] || null;
  }

  /** 向会话添加消息 */
  static async addMessageToSession(
    sessionId: string,
    message: MemoryMessage,
  ): Promise<void> {
    const session = chatSessions[sessionId];
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    session.messages.push(message);
    session.updatedAt = Date.now();

    // 如果是第一条用户消息，更新会话标题
    if (session.messages.length === 1 && message.from === "user") {
      const textContent = message.content.find((item) => item.type === "text");
      if (textContent && typeof textContent.content === "string") {
        session.title = textContent.content.slice(0, 50);
      }
    }

    await saveToFile();
  }

  /** 更新会话标题 */
  static async updateSessionTitle(
    sessionId: string,
    title: string,
  ): Promise<void> {
    const session = chatSessions[sessionId];
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    session.title = title;
    session.updatedAt = Date.now();
    await saveToFile();
  }

  static async deleteSession(sessionId: string): Promise<void> {
    if (chatSessions[sessionId]) {
      delete chatSessions[sessionId];
      await saveToFile();
    }
  }

  static async deleteSessionsByAgent(agentId: string): Promise<void> {
    const sessionIds = Object.keys(chatSessions).filter(
      (id) => chatSessions[id].agentId === agentId,
    );

    for (const sessionId of sessionIds) {
      delete chatSessions[sessionId];
    }

    await saveToFile();
  }

  static async getSessionMessages(sessionId: string): Promise<MemoryMessage[]> {
    const session = chatSessions[sessionId];
    if (!session) {
      return [];
    }

    return session.messages;
  }

  static async clearAllSessions(): Promise<void> {
    chatSessions = {};
    await saveToFile();
  }
}
