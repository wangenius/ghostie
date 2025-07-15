import { CoreMessage, MemoryMessage } from "@common/types/MessageType";
import { gen } from "@common/generator";
import { Agent } from "./Agent";
/* 上下文 */
export interface ContextRuntimeProps {
  id: string;
  messages: MemoryMessage[];
  system?: MemoryMessage;
  created_at: number;
  updated_at: number;
}
/**
 * 上下文类，管理Agent的上下文信息
 */
export class Context {
  /** 上下文ID */
  agent: Agent;
  /** 运行时上下文 */
  runtime: ContextRuntimeProps;
  /**
   * 构造函数
   */
  constructor(agent: Agent) {
    this.agent = agent;
    this.runtime = {
      id: gen.id(),
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  setRuntime(runtime?: ContextRuntimeProps) {
    if (runtime) {
      this.runtime = runtime;
    } else {
      this.runtime = {
        id: gen.id(),
        messages: [],
        system: {
          role: "system",
          content: this.agent.props.system || "",
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    }
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
  getCompletionMessages(): CoreMessage[] {
    return this.getMessages()
      .filter((msg) => !msg.error)
      .map((msg) => {
        const result: Record<string, any> = {
          role: msg.role,
          content: msg.content + (msg.extra ? `\n\n${msg.extra}` : ""),
        };
        if (msg.tool_calls) result.tool_calls = msg.tool_calls;
        if (msg.tool_call_id) result.tool_call_id = msg.tool_call_id;
        return result as CoreMessage;
      });
  }

  reset() {
    this.runtime = {
      id: gen.id(), // 生成新的会话ID
      system: {
        role: "system",
        content: this.agent.props.system || "",
        created_at: Date.now(),
      },
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }
  update(messages: MemoryMessage[]) {
    this.runtime = {
      ...this.runtime,
      messages,
      updated_at: Date.now(),
    };
  }

  getMessages() {
    const messages = [...this.runtime.messages];
    if (this.runtime.system) {
      return [this.runtime.system, ...messages];
    }
    return messages;
  }

  getLastMessage() {
    return this.runtime.messages[this.runtime.messages.length - 1];
  }

  addLastMessage(message: MemoryMessage) {
    this.runtime = {
      ...this.runtime,
      messages: [...this.runtime.messages, message],
      updated_at: Date.now(),
    };
  }

  updateLastMessage(message: Partial<MemoryMessage>) {
    this.runtime = {
      ...this.runtime,
      messages: [
        ...this.runtime.messages.slice(0, -1),
        {
          ...this.runtime.messages[this.runtime.messages.length - 1],
          ...message,
        },
      ],
    };
    this.runtime.updated_at = Date.now();
  }

  setSystem(system: string) {
    this.runtime = {
      ...this.runtime,
      system: {
        role: "system",
        content: system,
        created_at: Date.now(),
      },
    };
  }

  pushMessage(message: MemoryMessage) {
    this.runtime = {
      ...this.runtime,
      messages: [...this.runtime.messages, message],
    };
  }
}
