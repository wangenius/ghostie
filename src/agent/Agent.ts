import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
} from "@/agent/types/agent";
import { ImageManager } from "@/resources/Image";
import { AgentsListStore } from "@/store/agents";
import { gen } from "@/utils/generator";
import { Context } from "./context/Context";
import { Engine } from "./engine/Engine";

/** Agent类 */
export class Agent {
  /* Agent配置 */
  props: AgentInfos;
  /* Agent引擎 */
  engine: Engine;
  /* 上下文 */
  context: Context;

  /** 构造函数 */
  constructor(agent?: Partial<AgentInfos>) {
    this.props = { ...DEFAULT_AGENT, ...agent };
    /* 创建上下文 */
    this.context = Context.create(this);
    /* 引擎 */
    this.engine = Engine.create(this);
  }

  /** 创建代理 */
  static async create(config: Partial<AgentInfos> = {}): Promise<Agent> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const agent = new Agent({ ...config, id });
    /* 返回代理 */
    return agent;
  }

  async sync() {
    AgentsListStore.set({ [this.props.id]: this.props });
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentInfos, "id">>) {
    if (!this.props.id) {
      return this;
    }
    this.props = { ...this.props, ...data };
    this.engine = Engine.create(this);
    this.sync();
    return this;
  }

  /* 机器人对话 */
  public async chat(input: string, options?: AgentChatOptions) {
    let content = input;
    let images: string[] = [];
    await Promise.all(
      options?.images?.map(async (image) => {
        const id = gen.id();
        await ImageManager.setImage(
          id,
          `data:${image.contentType};base64,${image.base64Image}`,
        );
        images.push(id);
      }) ?? [],
    );
    return await this.engine.execute(content, {
      images,
      extra: images.length > 0 ? `图片的ID:${images.join(",")}` : "",
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
