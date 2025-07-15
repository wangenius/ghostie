import { MemoryMessage } from "../../common/types/MessageType";
import { ChatSession, ChatMessage } from "../../common/types/agent";
import { gen } from "../utils/generator";
import fs from "fs";
import path from "path";
import { app } from "electron";

// 内存存储
let chatSessions: Record<string, ChatSession> = {};

// 获取聊天历史数据存储路径
const getChatHistoryPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "chat_history.json");
};

// 保存到文件
const saveToFile = async () => {
  try {
    const dataPath = getChatHistoryPath();
    const dir = path.dirname(dataPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(chatSessions, null, 2));
  } catch (error) {
    console.error("保存聊天历史失败:", error);
  }
};

// 从文件加载
const loadFromFile = async () => {
  try {
    const dataPath = getChatHistoryPath();
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, "utf-8");
      chatSessions = JSON.parse(data);
    }
  } catch (error) {
    console.error("加载聊天历史失败:", error);
    chatSessions = {};
  }
};

// 转换MessageItem到ChatMessage
const convertMessageItemToChatMessage = (item: MemoryMessage): ChatMessage | null => {
  // 过滤掉tool角色的消息，因为ChatMessage不支持
  if (item.role === 'tool') {
    return null;
  }

  return {
    id: gen.id(),
    role: item.role as "user" | "assistant" | "system",
    content: item.content,
    timestamp: item.created_at,
    images: item.images?.map(img => {
      // 处理base64图片数据
      if (typeof img === 'string' && img.startsWith('data:')) {
        const [mimeType, base64Data] = img.split(',');
        const contentType = mimeType.split(':')[1].split(';')[0];
        return {
          contentType,
          base64Image: base64Data,
        };
      }
      return {
        contentType: 'image/png',
        base64Image: img as string,
      };
    }),
  };
};

// 转换ChatMessage到MessageItem
const convertChatMessageToMessageItem = (message: ChatMessage): MemoryMessage => {
  return {
    role: message.role,
    content: message.content,
    created_at: message.timestamp,
    images: message.images?.map(img => `data:${img.contentType};base64,${img.base64Image}`),
  };
};

export class ChatHistoryManager {
  /** 初始化聊天历史管理器 */
  static async init() {
    await loadFromFile();
  }

  /** 创建新的聊天会话 */
  static async createSession(agentId: string, firstMessage?: MemoryMessage): Promise<ChatSession> {
    const messages: ChatMessage[] = [];
    if (firstMessage) {
      const convertedMessage = convertMessageItemToChatMessage(firstMessage);
      if (convertedMessage) {
        messages.push(convertedMessage);
      }
    }

    const session: ChatSession = {
      id: gen.id(),
      agentId,
      title: firstMessage?.content?.slice(0, 50) || "新对话",
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
      .filter(session => session.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return sessions;
  }

  /** 获取特定会话 */
  static async getSession(sessionId: string): Promise<ChatSession | null> {
    return chatSessions[sessionId] || null;
  }

  /** 向会话添加消息 */
  static async addMessageToSession(sessionId: string, message: MemoryMessage): Promise<void> {
    const session = chatSessions[sessionId];
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    const chatMessage = convertMessageItemToChatMessage(message);
    if (chatMessage) {
      session.messages.push(chatMessage);
      session.updatedAt = Date.now();

      // 如果是第一条用户消息，更新会话标题
      if (session.messages.length === 1 && message.role === "user") {
        session.title = message.content.slice(0, 50);
      }

      await saveToFile();
    }
  }

  /** 更新会话标题 */
  static async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const session = chatSessions[sessionId];
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    session.title = title;
    session.updatedAt = Date.now();
    await saveToFile();
  }

  /** 删除会话 */
  static async deleteSession(sessionId: string): Promise<void> {
    if (chatSessions[sessionId]) {
      delete chatSessions[sessionId];
      await saveToFile();
    }
  }

  /** 删除Agent的所有会话 */
  static async deleteSessionsByAgent(agentId: string): Promise<void> {
    const sessionIds = Object.keys(chatSessions).filter(
      id => chatSessions[id].agentId === agentId
    );

    for (const sessionId of sessionIds) {
      delete chatSessions[sessionId];
    }

    await saveToFile();
  }

  /** 获取会话的消息列表（转换为MessageItem格式） */
  static async getSessionMessages(sessionId: string): Promise<MemoryMessage[]> {
    const session = chatSessions[sessionId];
    if (!session) {
      return [];
    }

    return session.messages.map(convertChatMessageToMessageItem);
  }

  /** 清空所有会话 */
  static async clearAllSessions(): Promise<void> {
    chatSessions = {};
    await saveToFile();
  }
} 