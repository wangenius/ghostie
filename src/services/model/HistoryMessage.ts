/** 消息管理类
 * 负责管理所有的消息历史记录
 */
import { gen } from "@/utils/generator";
import {
  FunctionCallReply,
  Message,
  MessagePrototype,
} from "@common/types/model";
import { Echo } from "echo-state";

/** 消息历史记录类 */
export class HistoryMessage {
  id: string;
  bot?: string;
  system: Message;
  list: Message[];

  constructor() {
    this.id = gen.id();
    this.system = {
      role: "system",
      content: "",
      type: "system",
      created_at: Date.now(),
    };
    this.list = [];
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: this.list,
      },
    });
  }
  /* 聊天历史 */
  static ChatHistory = new Echo<
    Record<
      string,
      {
        bot?: string;
        /* 系统提示词 */
        system: Message;
        /* 聊天记录 */
        list: Message[];
      }
    >
  >(
    {},
    {
      name: "chatHistory",
      sync: true,
    }
  );

  setBot(bot: string): void {
    this.bot = bot;
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: this.list,
      },
    });
  }

  setSystem(system: string): void {
    this.system = {
      ...this.system,
      content: system,
    };
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: this.list,
      },
    });
  }

  setList(list: Message[]): void {
    this.list = list;
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: this.list,
      },
    });
  }

  /** 添加消息, 返回所有消息
   * @param message 要添加的消息
   * @returns 所有消息, 包括系统消息
   */
  push(message: Message[]): Message[] {
    this.list = [...this.list, ...message];
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: this.list,
      },
    });
    return [this.system, ...this.list];
  }

  /** 更新最后一条消息
   * @param updater 更新函数，接收最后一条消息并返回更新后的消息
   * @returns 更新后的消息，如果没有消息则返回undefined
   */
  updateLastMessage(msg: Partial<Message>): Message | undefined {
    const list = this.list;
    const system = this.system;
    if (list.length === 0) return undefined;

    const lastMessage = list[list.length - 1];
    const updatedMessage = {
      ...lastMessage,
      ...msg,
      // 确保type字段只在明确指定时才更新
      type: msg.type || lastMessage.type,
    };

    this.list = [...list.slice(0, -1), updatedMessage];

    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system,
        list: this.list,
      },
    });
    return updatedMessage;
  }

  /** 获取最后一条消息
   * @returns 最后一条消息，如果没有消息则返回undefined
   */
  getLastMessage(): Message | undefined {
    return this.list.length > 0 ? this.list[this.list.length - 1] : undefined;
  }

  /** 获取所有消息（不包括系统消息）
   * @returns 所有消息的数组
   */
  listWithOutType(): MessagePrototype[] {
    return [this.system, ...this.list].map((msg) => {
      const result: Record<string, any> = {
        role: msg.role,
        content: msg.content,
      };
      if (msg.name) result.name = msg.name;
      if (msg.function_call) result.function_call = msg.function_call;
      return result as MessagePrototype;
    });
  }

  /** 清空所有消息历史, 保留系统消息 */
  clear(): void {
    this.list = [];
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: [],
      },
    });
  }

  /** 移除最后一条消息 */
  removeLast(): void {
    const list = this.list;
    if (list.length === 0) return;
    this.list = list.slice(0, -1);
    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: list.slice(0, -1),
      },
    });
  }

  /** 获取消息数量（不包括系统消息）
   * @returns 消息数量
   */
  count(): number {
    return this.list.length;
  }

  /** 替换最后一条消息
   * @param message 新的消息
   */
  replaceLastMessage(message: Message): void {
    const list = this.list;
    if (list.length === 0) return;

    HistoryMessage.ChatHistory.set({
      [this.id]: {
        bot: this.bot,
        system: this.system,
        list: [...list.slice(0, -1), message],
      },
    });
  }
  /** 删除聊天历史
   * @param id 要删除的聊天历史ID
   */
  static deleteHistory(id: string) {
    // 删除历史记录
    HistoryMessage.ChatHistory.delete(id);
  }
  /** 更新助手消息的函数调用
   * @param functionCall 函数调用数据
   */
  updateAssistantFunctionCall(functionCall: FunctionCallReply): void {
    this.updateLastMessage({
      function_call: functionCall,
      type: "assistant:tool",
    });
  }
}
