import { AgentChatOptions, AgentProps } from "@/agent/types/agent";
import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import { Engine } from "./engine/Engine";
import { AGENT_DATABASE } from "@/assets/const";
import { ImagesStore } from "@/resources/Image";

export const DEFAULT_AGENT: AgentProps = {
  id: "",
  name: "",
  system: "",
  tools: [],
  engine: "react",
};

export const AgentStore = new Echo<Record<string, AgentProps>>({}).indexed({
  database: AGENT_DATABASE,
  name: "index",
});

/** 代理 */
export class Agent {
  /* 代理ID */
  props: AgentProps = DEFAULT_AGENT;
  /* Agent引擎 */
  engine: Engine;
  /** 构造函数 */
  constructor(agent?: Partial<AgentProps>) {
    this.props = { ...DEFAULT_AGENT, ...agent };
    this.engine = Engine.create(this);
  }

  /** 创建代理 */
  static async create(config: Partial<AgentProps> = {}): Promise<Agent> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const agent = new Agent({ ...config, id });
    /* 保存代理 */
    AgentStore.set({
      [id]: agent.props,
    });
    /* 返回代理 */
    return agent;
  }

  static async get(id: string): Promise<Agent> {
    const agent = await AgentStore.getCurrent();
    if (!agent[id]) {
      throw new Error("Agent ID not found");
    }
    return new Agent(agent[id]);
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentProps, "id">>) {
    if (!this.props.id) {
      return this;
    }
    /* 实例 */
    this.props = { ...this.props, ...data };
    /* 更新代理 */
    AgentStore.set({
      [this.props.id]: { ...this.props },
    });
    this.engine = Engine.create(this);
    return this;
  }

  /* 删除机器人 */
  static async delete(id: string) {
    AgentStore.delete(id);
  }

  /* 机器人对话 */
  public async chat(input: string, options?: AgentChatOptions) {
    let content = input;
    let images: string[] = [];
    options?.images?.forEach((image) => {
      const id = gen.id();
      ImagesStore.set({
        [id]: {
          id,
          contentType: image.contentType,
          base64Image: image.base64Image,
        },
      });
      images.push(id);
    });
    return await this.engine.execute(content, {
      images,
      extra: `图片的ID:${images.join(",")}`,
    });
  }

  /* 停止机器人 */
  stop() {
    this.engine.stop();
  }

  close() {
    this.engine.close();
    this.props = DEFAULT_AGENT;
  }
}
