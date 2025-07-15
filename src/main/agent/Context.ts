import { gen } from "@common/generator";
import {
  AgentMemoryMessage,
  AgentMessageContent,
  MemoryMessage,
  UserMemoryMessage,
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
    if (this.messages[this.messages.length - 1].from === "agent") {
      this.messages[this.messages.length - 1] = {
        ...this.messages[this.messages.length - 1] as AgentMemoryMessage,
        content: [...this.messages[this.messages.length - 1].content, message],
      };
    } else {
      this.messages[this.messages.length - 1] = {
        ...this.messages[this.messages.length - 1] as UserMemoryMessage,
        content: [...this.messages[this.messages.length - 1].content, message],
      };
    }
    this.updated_at = Date.now();
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
