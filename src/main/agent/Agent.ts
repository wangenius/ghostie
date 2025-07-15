import { Context } from "@/agent/Context";
import { LLM } from "@/model/llm/LLM";
import { gen } from "@common/generator";
import {
  AgentChatOptions,
  AgentProps,
  DEFAULT_AGENT,
  ExecuteOptions,
} from "@common/types/agent";
import { MemoryMessage } from "@common/types/MessageType";
import { ReactAgent } from "./ReactAgent";

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
    this.context = new Context();
    this.model = LLM.get(this.props.models.chat);
  }

  /** 创建代理或者获取代理 */
  static async create(id?: string): Promise<Agent> {
    /* 创建代理 */
    const infos = { ...DEFAULT_AGENT, id: id || gen.id() };
    /* 返回代理 */
    return new ReactAgent(infos);
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
  ): Promise<MemoryMessage> {
    throw new Error("chat方法需要在子类中实现");
  }

  /* Agent执行 - 基类默认实现，子类需要重写 */
  async run(_input: string, _options?: ExecuteOptions): Promise<MemoryMessage> {
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
