import { CONTEXT_RUNTIME_DATABASE } from "@/assets/const";
import { Echoi } from "@/lib/echo/Echo";
import { CompletionMessage, MessageItem } from "@/model/types/chatModel";
import { gen } from "@/utils/generator";
import { makeAutoObservable, reaction, toJS } from "mobx";
import { Agent } from "../Agent";
import { ContextMemory } from "./Memory";
/* 上下文 */
export interface ContextRuntimeProps {
  id: string;
  system: MessageItem;
  messages: MessageItem[];
  created_at: number;
  updated_at: number;
}
/**
 * 上下文类，管理Agent的上下文信息
 */
export class Context {
  /** 上下文ID */
  agent: Agent;
  /** 持久化记忆体： 一个新的Agent对话，也会保持一致。 */
  memory: ContextMemory;
  /** 运行时上下文 */
  runtime: ContextRuntimeProps;
  echo: Echoi<Record<string, ContextRuntimeProps>>;
  /**
   * 构造函数
   */
  private constructor(agent: Agent) {
    this.agent = agent;
    this.memory = new ContextMemory();
    this.echo = Echoi.get({
      database: CONTEXT_RUNTIME_DATABASE,
      name: agent.infos.id,
    });
    this.runtime = {
      id: gen.id(),
      messages: [],
      system: {
        role: "system",
        content: this.agent.infos.system || "",
        created_at: Date.now(),
      },
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    makeAutoObservable(this);
    reaction(
      () => this.runtime,
      () => {
        if (this.runtime.messages.length > 0) {
          this.echo.ready({ [this.runtime.id]: toJS(this.runtime) });
        }
      },
    );
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
          content: this.agent.infos.system || "",
          created_at: Date.now(),
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
  getCompletionMessages(): CompletionMessage[] {
    return this.getMessages()
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

  reset() {
    this.runtime = {
      ...this.runtime,
      messages: [],
    };
  }
  update(messages: MessageItem[]) {
    this.runtime = {
      ...this.runtime,
      messages,
      updated_at: Date.now(),
    };
  }

  getMessages() {
    return [this.runtime.system, ...this.runtime.messages];
  }

  getLastMessage() {
    return this.runtime.messages[this.runtime.messages.length - 1];
  }

  addLastMessage(message: MessageItem) {
    this.runtime = {
      ...this.runtime,
      messages: [...this.runtime.messages, message],
      updated_at: Date.now(),
    };
  }

  updateLastMessage(message: Partial<MessageItem>) {
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

  pushMessage(message: MessageItem) {
    this.runtime = {
      ...this.runtime,
      messages: [...this.runtime.messages, message],
    };
  }
}
