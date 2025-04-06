/** 消息管理类
 * 负责管理所有的消息历史记录
 */
import { MessageItem, MessagePrototype } from "@/model/types/chatModel";
import { gen } from "@/utils/generator";
import { Echo } from "echo-state";

/** 聊天历史记录 */
export interface HistoryItem {
  /** 聊天ID */
  id: string;
  /** 助手名称 */
  agent?: string;
  /** 系统提示词 */
  system: MessageItem;
  /** 聊天记录 */
  list: MessageItem[];
}

export const ChatHistory = new Echo<Record<string, HistoryItem>>({}).indexed({
  database: "history",
  name: "chat",
});

/** 消息类
 * 负责管理单个聊天的历史记录
 */
export class Message implements HistoryItem {
  /** 聊天ID */
  id: string;
  /** 助手名称 */
  agent?: string;
  /** 系统提示词 */
  system: MessageItem;
  /** 聊天记录 */
  list: MessageItem[];

  /** 创建一个消息 */
  private constructor(history: HistoryItem) {
    this.id = history.id;
    this.system = history.system;
    this.list = history.list;
    this.agent = history.agent;
  }

  /** 切换模型
   * @param id 模型ID
   * @returns 模型实例
   */
  async switch(id: string): Promise<this> {
    this.id = id;
    const history = await ChatHistory.getCurrent();
    if (!history) {
      throw new Error("History not found");
    }
    this.system = history[id].system;
    this.list = history[id].list;
    this.agent = history[id].agent;
    return this;
  }

  /** 创建一个消息
   * @param system 系统提示词
   * @param agent 助手名称
   * @returns 消息
   */
  static create(system: string = "", agent?: string): Message {
    const history: HistoryItem = {
      id: gen.id(),
      agent,
      system: {
        role: "system",
        content: system,
        created_at: Date.now(),
      },
      list: [],
    };
    return new Message(history);
  }

  /** 获取一个消息历史记录
   * @param id 消息历史记录ID
   * @returns 消息历史记录, 如果id不存在, 则创建一个默认的消息历史记录
   */
  static async getHistory(id: string): Promise<Message> {
    const history = (await ChatHistory.getCurrent())?.[id];
    if (!history) {
      throw new Error("History not found");
    }
    return new Message(history);
  }

  /** 设置助手名称 */
  setAgent(agent: string): void {
    this.agent = agent;
  }

  /** 获取聊天记录 */
  getList(): MessageItem[] {
    return this.list;
  }

  /** 设置系统提示词 */
  setSystem(system: string): void {
    this.system = {
      ...this.system,
      content: system,
    };
  }

  /** 设置聊天记录 */
  setList(list: MessageItem[]): void {
    this.list = list;
  }

  /** 处理消息列表，应用最大历史限制并移除开头的 tool 消息
   * @returns 处理后的消息原型数组
   */
  private processMessages(messages: MessageItem[]): MessagePrototype[] {
    return [this.system, ...messages]
      .filter((msg) => !msg.error)
      .map((msg) => {
        const result: Record<string, any> = {
          role: msg.role,
          content: msg.content,
        };
        if (msg.tool_calls) result.tool_calls = msg.tool_calls;
        if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
        return result as MessagePrototype;
      });
  }

  /** 添加消息, 返回所有消息
   * @param message 要添加的消息
   * @returns 所有消息, 包括系统消息，但不包括 type 为 assistant:warning 的消息
   */
  push(message: MessageItem[]): MessagePrototype[] {
    const newList = [...this.list, ...message];
    this.list = newList;
    ChatHistory.set({
      ...ChatHistory.current,
      [this.id]: {
        id: this.id,
        agent: this.agent,
        system: this.system,
        list: newList,
      },
    });
    return this.processMessages(this.list);
  }

  /** 获取所有消息（不包括系统消息）
   * @returns 所有消息的数组
   */
  listWithOutType(): MessagePrototype[] {
    return this.processMessages(this.list);
  }

  /** 更新最后一条消息
   * @param updater 更新函数，接收最后一条消息并返回更新后的消息
   * @returns 更新后的消息，如果没有消息则返回undefined
   */
  updateLastMessage(msg: Partial<MessageItem>): MessageItem | undefined {
    const list = this.list;
    if (list.length === 0) return undefined;
    const lastMessage = list[list.length - 1];
    const updatedMessage = {
      ...lastMessage,
      ...msg,
    };

    this.list = [...list.slice(0, -1), updatedMessage];
    ChatHistory.set((prev) => {
      const newState = { ...prev };
      newState[this.id] = {
        ...newState[this.id],
        list: this.list,
      };
      return newState;
    });
    return updatedMessage;
  }

  /** 获取最后一条消息
   * @returns 最后一条消息，如果没有消息则返回undefined
   */
  getLastMessage(): MessageItem | undefined {
    return this.list.length > 0 ? this.list[this.list.length - 1] : undefined;
  }

  /** 清空所有消息历史, 保留系统消息 */
  clear(): void {
    this.list = [];
    ChatHistory.set((prev) => {
      const newState = { ...prev };
      newState[this.id].list = [];
      return newState;
    });
  }

  /** 清空所有消息历史, 包括系统消息 */
  static clearAll(): void {
    ChatHistory.set({}, { replace: true });
  }

  /** 移除最后一条消息 */
  removeLast(): void {
    const list = this.list;
    if (list.length === 0) return;
    this.list = list.slice(0, -1);
    ChatHistory.set((prev) => {
      const newState = { ...prev };
      newState[this.id].list = this.list;
      return newState;
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
  replaceLastMessage(message: MessageItem): void {
    const list = this.list;
    if (list.length === 0) return;

    ChatHistory.set((prev) => {
      const newState = { ...prev };
      newState[this.id].list = [...list.slice(0, -1), message];
      return newState;
    });
  }
  /** 删除聊天历史
   * @param id 要删除的聊天历史ID
   */
  static deleteHistory(id: string) {
    // 删除历史记录
    ChatHistory.set(
      (prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      },
      { replace: true },
    );
  }
}
