import { MessageItem } from "@/model/types/chatModel";
import { gen } from "@/utils/generator";
import { Agent } from "../Agent";
import { CurrentAgentContextRuntime } from "@/store/agents";

export interface ContextRuntimeProps {
  id: string;
  system: MessageItem;
  messages: MessageItem[];
  created_at: number;
  updated_at: number;
}

export class ContextRuntime {
  agent: Agent;
  private props: ContextRuntimeProps;

  constructor(agent: Agent, existingProps?: ContextRuntimeProps) {
    this.agent = agent;
    if (existingProps) {
      // 使用现有的ContextRuntimeProps，但更新updated_at
      this.props = {
        ...existingProps,
      };
    } else {
      // 创建新的ContextRuntimeProps
      this.props = {
        id: gen.id(),
        messages: [],
        system: {
          role: "system",
          content: agent.props.system || "",
          created_at: Date.now(),
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    }
  }

  // 属性变化时自动调用的方法
  protected sync() {
    if (CurrentAgentContextRuntime.getKeyName() === this.agent.props.id) {
      CurrentAgentContextRuntime.set({
        [this.props.id]: { ...this.props, updated_at: Date.now() },
      });
    }
  }

  update(messages: MessageItem[]) {
    this.props.messages = messages;
    this.props.updated_at = Date.now();
    this.sync();
  }

  getMessages() {
    return [this.props.system, ...this.props.messages];
  }

  getLastMessage() {
    return this.props.messages[this.props.messages.length - 1];
  }

  addLastMessage(message: MessageItem) {
    this.props.messages.push(message);
    this.props.updated_at = Date.now();
    this.sync();
  }

  updateLastMessage(message: Partial<MessageItem>) {
    this.props.messages[this.props.messages.length - 1] = {
      ...this.props.messages[this.props.messages.length - 1],
      ...message,
    } as MessageItem;
    this.props.updated_at = Date.now();
    this.sync();
  }

  get info() {
    return this.props;
  }

  setSystem(system: string) {
    this.props.system = {
      role: "system",
      content: system,
      created_at: Date.now(),
    };
    this.sync();
  }

  push(message: MessageItem) {
    this.props.messages.push(message);
    this.sync();
  }

  reset() {
    this.props.messages = [];
    this.sync();
  }
}
