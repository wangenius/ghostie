/** 消息管理类
 * 负责管理所有的消息历史记录
 */

import { Message } from "@common/types/model";
import { Echo } from "echo-state";

/** 消息历史记录类 */
export class HistoryMessage {
    /** 消息列表 */
    messages = new Echo<{
        system: Message;
        list: Message[];
    }>({
        system: { role: "system", content: "" },
        list: []
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
            list: result
        });
        return [this.messages.current.system, ...result];
    }

    /** 创建一个新的助手消息并返回
     * @returns 新创建的助手消息
     */
    createAssistantMessage(): Message {
        const assistantMessage: Message = { role: "assistant", content: "" };
        this.push([assistantMessage]);
        return assistantMessage;
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
            list: [...list.slice(0, -1), lastMessage]
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
            system: { role: "system", content },
            list: this.messages.current.list
        });
    }

    /** 获取所有消息（包括系统消息）
     * @returns 所有消息的数组
     */
    list(): Message[] {
        return [this.messages.current.system, ...this.messages.current.list];
    }

    /** 清空所有消息历史, 保留系统消息 */
    clear(): void {
        this.messages.set({
            system: this.messages.current.system,
            list: []
        });
    }

    /** 移除最后一条消息 */
    removeLast(): void {
        this.messages.set({
            system: this.messages.current.system,
            list: this.messages.current.list.slice(0, -1)
        });
    }

    /** 获取消息数量（不包括系统消息）
     * @returns 消息数量
     */
    count(): number {
        return this.messages.current.list.length;
    }
}
