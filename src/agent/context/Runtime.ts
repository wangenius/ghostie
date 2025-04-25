import { MessageItem } from "@/model/types/chatModel";
import { gen } from "@/utils/generator";
import { Agent } from "../Agent";

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
          content: agent.infos.system || "",
          created_at: Date.now(),
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    }
  }

  update(messages: MessageItem[]) {
    this.props.messages = messages;
    this.props.updated_at = Date.now();
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
  }

  updateLastMessage(message: Partial<MessageItem>) {
    this.props.messages[this.props.messages.length - 1] = {
      ...this.props.messages[this.props.messages.length - 1],
      ...message,
    } as MessageItem;
    this.props.updated_at = Date.now();
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
  }

  push(message: MessageItem) {
    this.props.messages.push(message);
  }

  reset() {
    this.props.messages = [];
  }
}
