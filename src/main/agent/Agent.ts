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
    console.log("Agent constructor", props);
    this.context = new Context(props.system);
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
    const oldProps = this.props;
    this.props = { ...this.props, ...data };
    
    // 如果模型配置发生变化，重新初始化模型实例
    if (data.models) {
      let modelUpdated = false;
      
      // 检查chat模型是否变更（这是主要使用的模型）
      if (data.models.chat && data.models.chat !== oldProps.models.chat) {
        // 停止旧模型
        if (this.model) {
          this.model.stop();
        }
        // 创建新模型实例
        this.model = LLM.get(this.props.models.chat);
        console.log(`Agent ${this.props.id} chat模型已更新为: ${JSON.stringify(this.props.models.chat)}`);
        modelUpdated = true;
      }
      
      // 如果没有chat模型但有其他模型变更，也记录日志
      if (!modelUpdated) {
        const changedModels = Object.keys(data.models).filter(key => 
          data.models![key as keyof typeof data.models] !== oldProps.models[key as keyof typeof oldProps.models]
        );
        if (changedModels.length > 0) {
          console.log(`Agent ${this.props.id} 模型配置已更新: ${changedModels.join(', ')}`);
        }
      }
    }
    
    // 如果系统提示词发生变化，更新上下文
    if (data.system && data.system !== oldProps.system) {
      this.context.setSystem(data.system);
      console.log(`Agent ${this.props.id} 系统提示词已更新`);
    }
    
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

  /* 关闭Agent */
  close() {
    this.model.stop();
    this.context.reset();
  }
}
