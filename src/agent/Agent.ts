import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
} from "@/agent/types/agent";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { Context } from "./context/Context";
import { Engine } from "./engine/Engine";

/** Agent类 */
export class Agent {
  /* Agent配置 */
  infos!: AgentInfos;
  /* Agent引擎 */
  engine!: Engine;
  /* 上下文 */
  context!: Context;

  /** 构造函数 */
  private constructor(infos: AgentInfos) {
    this.infos = infos;
  }

  /** 创建代理 */
  static create(config: Partial<AgentInfos> = {}): Agent {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const agent = new Agent({ ...DEFAULT_AGENT, ...config, id });
    agent.context = Context.create(agent);
    agent.engine = Engine.create(agent);
    /* 返回代理 */
    return agent;
  }

  /* 更新机器人元数据 */
  async update(data: Partial<Omit<AgentInfos, "id">>) {
    if (!this.infos.id) {
      return this;
    }
    this.infos = { ...this.infos, ...data };
    /* update之后更新引擎 */
    this.engine = Engine.create(this);
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
    this.infos = DEFAULT_AGENT;
  }
}
