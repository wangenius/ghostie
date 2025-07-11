import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
} from "@/agent/types/agent";
import { gen } from "@/utils/generator";
import { Context } from "./context/Context";
import { Engine } from "./engine/Engine";
/** Agent类 */
export class Agent {
  /* 配置信息 */
  infos: AgentInfos;
  /* Agent引擎: 一个Agent的引擎，可能会更换，但是不需要直接体现到数据上 */
  engine: Engine;
  /* 上下文 */
  context: Context;

  /** 构造函数 */
  private constructor(infos: AgentInfos) {
    this.infos = infos;
    this.context = Context.create(this);
    this.engine = Engine.create(this);
  }

  /** 创建代理或者获取代理 */
  static async create(id?: string): Promise<Agent> {
    /* 创建代理 */
    let infos = (await AgentManager.list.getCurrent())[id || ""];
    if (!infos) {
      infos = { ...DEFAULT_AGENT, id: id || gen.id() };
    }
    const agent = new Agent(infos);
    /* 返回代理 */
    return agent;
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentInfos, "id">>) {
    this.infos = { ...this.infos, ...data };
    /* update之后更新引擎 */
    this.engine = Engine.create(this);
    return this;
  }

  /* 机器人对话 */
  async chat(input: string, options?: AgentChatOptions) {
    let content = input;
    return await this.engine.execute(content, options);
  }

  stop() {
    this.engine.stop();
  }

  close() {
    this.engine.close();
  }
}
