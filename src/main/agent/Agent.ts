import { Context } from "@/agent/Context";
import { registerIpcHandlers } from "@/ipc/decorators";
import { LLM } from "@/model/llm/LLM";
import { gen } from "@/utils/generator";
import {
  AgentChatOptions,
  AgentProps,
  DEFAULT_AGENT,
  ExecuteOptions,
} from "@common/types/agent";
import { MessageItem } from "@common/types/chatModel";

/** Agent类 */
export class Agent {
  /* 配置信息 */
  props: AgentProps;
  /* 模型 */
  model: LLM;
  /* 上下文 */
  context: Context;

  /** 构造函数 */
  protected constructor(props: AgentProps) {
    this.props = props;
    this.context = Context.create(this);
    this.model = LLM.get(this.props.models.chat);
    // 自动注册 IPC 处理器
    registerIpcHandlers(this);
  }

  /** 创建代理或者获取代理 */
  static async create(id?: string): Promise<Agent> {
    /* 创建代理 */
    const infos = { ...DEFAULT_AGENT, id: id || gen.id() };
    // 根据engine类型创建相应的Agent子类
    const engineType = infos.engine || "react";
    // 动态导入并创建相应的Agent子类
    let agent: Agent;

    switch (engineType) {
      case "react":
      default: {
        const { ReactAgent } = await import("./ReactAgent");
        agent = new ReactAgent(infos);
        break;
      }
    }

    /* 返回代理 */
    return agent;
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentProps, "id">>) {
    this.props = { ...this.props, ...data };
    return this;
  }

  getProps() {
    return this.props;
  }

  /* 机器人对话 - 基类默认实现，子类需要重写 */
  async chat(
    _input: string,
    _options?: AgentChatOptions,
  ): Promise<MessageItem> {
    throw new Error("chat方法需要在子类中实现");
  }

  /* Agent执行 - 基类默认实现，子类需要重写 */
  async execute(
    _input: string,
    _options?: ExecuteOptions,
  ): Promise<MessageItem> {
    throw new Error("execute方法需要在子类中实现");
  }

  stop() {
    this.model.stop();
  }

  close() {
    this.model.stop();
    this.context.reset();
  }
}
