/** 视觉消息管理类
 * 负责管理所有的视觉消息历史记录
 */
import { VisionMessage as VisionMessageType } from "@/model/types/visionModel";
import { gen } from "@/utils/generator";

/** 视觉聊天历史记录 */
export interface VisionHistoryItem {
  /** 聊天ID */
  id: string;
  /** 助手名称 */
  agent?: string;
  /** 系统提示词 */
  system: VisionMessageType;
  /** 聊天记录 */
  list: VisionMessageType[];
}

/** 视觉消息类
 * 负责管理单个视觉聊天的历史记录
 */
export class VisionMessage implements VisionHistoryItem {
  /** 聊天ID */
  id: string;
  /** 助手名称 */
  agent?: string;
  /** 系统提示词 */
  system: VisionMessageType;
  /** 聊天记录 */
  list: VisionMessageType[];

  /** 创建一个消息 */
  private constructor(history: VisionHistoryItem) {
    this.id = history.id;
    this.system = history.system;
    this.list = history.list;
    this.agent = history.agent;
  }

  /** 创建一个消息
   * @param system 系统提示词
   * @param agent 助手名称
   * @returns 消息
   */
  static create(system: string = "", agent?: string): VisionMessage {
    const history: VisionHistoryItem = {
      id: gen.id(),
      agent,
      system: {
        role: "system",
        content: system,
      },
      list: [],
    };
    return new VisionMessage(history);
  }

  /** 设置助手名称 */
  setAgent(agent: string): void {
    this.agent = agent;
  }

  /** 获取聊天记录 */
  getList(): VisionMessageType[] {
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
  setList(list: VisionMessageType[]): void {
    this.list = list;
  }

  /** 处理消息列表，应用最大历史限制并移除开头的 tool 消息
   * @returns 处理后的消息原型数组
   */
  private processMessages(messages: VisionMessageType[]): VisionMessageType[] {
    return [this.system, ...messages].filter((msg) => !msg.error);
  }

  /** 添加消息, 返回所有消息
   * @param message 要添加的消息
   * @returns 所有消息, 包括系统消息，但不包括 type 为 assistant:warning 的消息
   */
  push(message: VisionMessageType[]): VisionMessageType[] {
    const newList = [...this.list, ...message];
    this.list = newList;
    return this.processMessages(this.list);
  }

  /** 获取所有消息（不包括系统消息）
   * @returns 所有消息的数组
   */
  listWithOutType(): VisionMessageType[] {
    return this.processMessages(this.list);
  }

  /** 更新最后一条消息
   * @param updater 更新函数，接收最后一条消息并返回更新后的消息
   * @returns 更新后的消息，如果没有消息则返回undefined
   */
  updateLastMessage(
    msg: Partial<VisionMessageType>,
  ): VisionMessageType | undefined {
    const list = this.list;
    if (list.length === 0) return undefined;
    const lastMessage = list[list.length - 1];
    const updatedMessage = {
      ...lastMessage,
      ...msg,
    };

    this.list = [...list.slice(0, -1), updatedMessage];

    return updatedMessage;
  }

  /** 获取最后一条消息
   * @returns 最后一条消息，如果没有消息则返回undefined
   */
  getLastMessage(): VisionMessageType | undefined {
    return this.list.length > 0 ? this.list[this.list.length - 1] : undefined;
  }

  /** 清空所有消息历史, 保留系统消息 */
  clear(): void {
    this.list = [];
  }

  /** 移除最后一条消息 */
  removeLast(): void {
    const list = this.list;
    if (list.length === 0) return;
    this.list = list.slice(0, -1);
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
  replaceLastMessage(message: VisionMessageType): void {
    const list = this.list;
    if (list.length === 0) return;
    this.list = [...list.slice(0, -1), message];
  }
}
