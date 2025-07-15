import { gen } from "@common/generator";
import {
  AgentMemoryMessage,
  AgentMessageContent,
  MemoryMessage
} from "@common/types/MessageType";

/**
 * 上下文类，管理Agent的上下文信息
 */
export class Context {
  id: string;
  messages: MemoryMessage[];
  system: MemoryMessage;
  created_at: number;
  updated_at: number;

  /**
   * 构造函数
   */
  constructor() {
    this.id = gen.id();
    this.messages = [];
    this.system = {
      from: "system",
      content: "你是一个智能助手",
    };
    this.created_at = Date.now();
    this.updated_at = Date.now();
  }

  reset() {
    this.messages = [];
    this.system = {
      from: "system",
      content: "你是一个智能助手",
    };
    this.created_at = Date.now();
    this.updated_at = Date.now();
  }

  update(messages: MemoryMessage[]) {
    this.messages = messages;
    this.updated_at = Date.now();
  }

  getMessages() {
    const messages = [...this.messages];
    if (this.system) {
      return [this.system, ...messages];
    }
    return messages;
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  addLastMessage(message: MemoryMessage) {
    this.messages.push(message);
    this.updated_at = Date.now();
  }

  updateLastMessage(message: AgentMessageContent) {
    const last = this.messages[this.messages.length - 1];
    if (last && last.from === "agent") {
      const agentMsg = last as AgentMemoryMessage;
      const content = [...agentMsg.content];
      
      // 如果是text类型，尝试合并到最后一个text内容中
      if (message.type === "text") {
        const lastTextIndex = content.findLastIndex(item => item.type === "text");
        if (lastTextIndex !== -1) {
          // 确保现有的content是字符串，如果不是则转换为字符串
          const existingContent = typeof content[lastTextIndex].content === "string" 
            ? content[lastTextIndex].content 
            : String(content[lastTextIndex].content);
          // 合并到最后一个text内容中
          content[lastTextIndex] = {
            ...content[lastTextIndex],
            content: existingContent + message.content
          };
        } else {
          // 没有找到text类型，直接添加
          content.push(message);
        }
      } else {
        // 非text类型，直接添加
        content.push(message);
      }
      
      this.messages[this.messages.length - 1] = {
        ...agentMsg,
        content,
      };
      this.updated_at = Date.now();
    } else {
      // 非 agent 消息不做处理，或可根据需要抛出警告
      // console.warn("updateLastMessage 只支持 agent 类型消息");
    }
  }

  setSystem(system: string) {
    this.system = {
      from: "system",
      content: system,
    };
    this.updated_at = Date.now();
  }

  pushMessage(message: MemoryMessage) {
    this.messages.push(message);
    this.updated_at = Date.now();
  }
}
