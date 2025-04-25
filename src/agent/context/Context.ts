import { CompletionMessage } from "@/model/types/chatModel";
import { Agent } from "../Agent";
import { ContextMemory } from "./Memory";
import { ContextRuntime } from "./Runtime";

/**
 * 上下文类，管理Agent的上下文信息
 */
export class Context {
  /** 上下文ID */
  agent: Agent;
  /** 持久化记忆体： 一个新的Agent对话，也会保持一致。 */
  memory: ContextMemory;
  /** 运行时上下文 */
  runtime: ContextRuntime;

  /**
   * 构造函数
   */
  constructor(agent: Agent) {
    this.agent = agent;
    this.memory = new ContextMemory();
    // 构造函数中创建一个新的运行时上下文
    this.runtime = new ContextRuntime(agent);
  }

  setRuntime(runtime: ContextRuntime) {
    this.runtime = runtime;
  }

  /**
   * 创建上下文的静态方法
   */
  static create(agent: Agent) {
    return new Context(agent);
  }

  /** 转化成completion格式
   * @returns 所有消息的数组
   */
  getCompletionMessages(): CompletionMessage[] {
    return this.runtime
      .getMessages()
      .filter((msg) => !msg.error)
      .map((msg) => {
        const result: Record<string, any> = {
          role: msg.role,
          content: msg.content + (msg.extra ? `\n\n${msg.extra}` : ""),
        };
        if (msg.tool_calls) result.tool_calls = msg.tool_calls;
        if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
        return result as CompletionMessage;
      });
  }

  setSystem(system: string) {
    this.runtime.setSystem(system);
  }

  reset() {
    this.runtime.reset();
  }
}
