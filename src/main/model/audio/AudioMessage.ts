import { AudioMessage as AudioMessageType } from "@/model/types/audioModel";

/** 音频消息类 */
export class AudioMessage {
  private messages: AudioMessageType[] = [];

  /** 创建消息实例 */
  static create() {
    return new AudioMessage();
  }

  /** 设置系统消息 */
  setSystem(content: string) {
    this.messages = [
      {
        role: "assistant",
        content,
      },
    ];
  }

  /** 添加消息 */
  push(messages: AudioMessageType[]) {
    this.messages.push(...messages);
  }

  /** 获取消息列表 */
  list() {
    return this.messages;
  }

  /** 获取不带类型的消息列表 */
  listWithOutType() {
    return this.messages.map(({ role, content }) => ({
      role,
      content,
    }));
  }

  /** 更新最后一条消息 */
  updateLastMessage(message: Partial<AudioMessageType>) {
    if (this.messages.length > 0) {
      this.messages[this.messages.length - 1] = {
        ...this.messages[this.messages.length - 1],
        ...message,
      };
    }
  }

  /** 清空消息 */
  clear() {
    this.messages = [];
  }
}
