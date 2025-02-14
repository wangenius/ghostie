/** 消息管理类
 * 负责管理所有的消息历史记录
 */

import {
  FunctionCallReply,
  Message,
  MessageType,
  MessagePrototype,
} from "@common/types/model";
import { Echo } from "echo-state";

/** 消息历史记录类 */
export class HistoryMessage {
  /** 消息列表 */
  messages = new Echo<{
    system: Message;
    list: Message[];
  }>({
    system: {
      role: "system",
      content: "",
      type: "system",
      created_at: Date.now(),
    },
    list: [],
  });

  use = this.messages.use.bind(this.messages);

  /** 添加消息, 返回所有消息
   * @param message 要添加的消息
   * @returns 所有消息, 包括系统消息
   */
  push(message: Message[]): Message[] {
    const result = [...this.messages.current.list, ...message];
    this.messages.set({
      system: this.messages.current.system,
      list: result,
    });
    return [this.messages.current.system, ...result];
  }

  /** 创建一个新的助手消息并返回
   * @returns 新创建的助手消息
   */
  createAssistantMessage(type: MessageType = "assistant:reply"): Message {
    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      type,
      created_at: Date.now(),
    };
    this.push([assistantMessage]);
    return assistantMessage;
  }

  /** 创建一个加载中的助手消息并返回
   * @returns 新创建的加载中的助手消息
   */
  createLoadingMessage(): Message {
    const loadingMessage: Message = {
      role: "assistant",
      content: "",
      type: "assistant:loading",
      created_at: Date.now(),
    };
    this.push([loadingMessage]);
    return loadingMessage;
  }

  /** 将加载中的助手消息转换为助手消息
   * @param type 要转换的消息类型
   */
  loadingToOther(message: Message): void {
    this.updateLastMessage((msg) => {
      msg = message;
      return msg;
    });
  }

  /** 更新最后一条消息
   * @param updater 更新函数，接收最后一条消息并返回更新后的消息
   * @returns 更新后的消息，如果没有消息则返回undefined
   */
  updateLastMessage(updater: (message: Message) => void): Message | undefined {
    const list = this.messages.current.list;
    if (list.length === 0) return undefined;

    const lastMessage = list[list.length - 1];
    updater(lastMessage);

    this.messages.set({
      system: this.messages.current.system,
      list: [...list.slice(0, -1), lastMessage],
    });

    return lastMessage;
  }

  /** 获取最后一条消息
   * @returns 最后一条消息，如果没有消息则返回undefined
   */
  getLastMessage(): Message | undefined {
    const list = this.messages.current.list;
    return list.length > 0 ? list[list.length - 1] : undefined;
  }

  system(content: string): void {
    this.messages.set({
      system: {
        role: "system",
        content,
        type: "system",
        created_at: Date.now(),
      },
      list: this.messages.current.list,
    });
  }

  /** 获取所有消息（包括系统消息）
   * @returns 所有消息的数组
   */
  list(): Message[] {
    return [this.messages.current.system, ...this.messages.current.list];
  }

  /** 获取所有消息（不包括系统消息）
   * @returns 所有消息的数组
   */
  listWithOutType(): MessagePrototype[] {
    return [this.messages.current.system, ...this.messages.current.list].map(
      (msg) => {
        const result: Record<string, any> = {
          role: msg.role,
          content: msg.content,
        };
        if (msg.name) result.name = msg.name;
        if (msg.function_call) result.function_call = msg.function_call;
        return result as MessagePrototype;
      }
    );
  }

  /** 清空所有消息历史, 保留系统消息 */
  clear(): void {
    this.messages.set({
      system: this.messages.current.system,
      list: [],
    });
  }

  /** 移除最后一条消息 */
  removeLast(): void {
    this.messages.set({
      system: this.messages.current.system,
      list: this.messages.current.list.slice(0, -1),
    });
  }

  /** 获取消息数量（不包括系统消息）
   * @returns 消息数量
   */
  count(): number {
    return this.messages.current.list.length;
  }

  /** 替换最后一条消息
   * @param message 新的消息
   */
  replaceLastMessage(message: Message): void {
    const list = this.messages.current.list;
    if (list.length === 0) return;

    this.messages.set({
      system: this.messages.current.system,
      list: [...list.slice(0, -1), message],
    });
  }

  /** 更新助手消息的内容
   * @param content 新的内容
   * @param type 消息类型
   */
  updateAssistantContent(
    content: string,
    type: MessageType = "assistant:reply"
  ): void {
    this.updateLastMessage((msg) => {
      if (msg.role === "assistant") {
        msg.content = content;
        msg.type = type;
      }
    });
  }

  /** 更新助手消息的函数调用
   * @param functionCall 函数调用数据
   */
  updateAssistantFunctionCall(functionCall: FunctionCallReply): void {
    this.updateLastMessage((msg) => {
      if (msg.role === "assistant") {
        msg.function_call = functionCall;
        msg.type = "assistant:tool";
      }
    });
  }
}
