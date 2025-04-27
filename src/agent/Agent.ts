import {
  AgentChatOptions,
  AgentInfos,
  DEFAULT_AGENT,
} from "@/agent/types/agent";
import { ImageManager } from "@/resources/Image";
import { AgentManager } from "@/store/AgentManager";
import { gen } from "@/utils/generator";
import { makeAutoObservable, reaction, toJS } from "mobx";
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
    makeAutoObservable(this);
    reaction(
      () => this.infos,
      () => {
        AgentManager.list.set({
          [this.infos.id]: toJS(this.infos),
        });
      },
    );
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
    /* 更新 infos - 确保使用普通对象 */
    const plainData = toJS(data);
    this.infos = { ...this.infos, ...plainData };
    /* update之后更新引擎 */
    this.engine = Engine.create(this);
    return this;
  }

  /* 机器人对话 */
  async chat(input: string, options?: AgentChatOptions) {
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

  stop() {
    this.engine.stop();
  }

  close() {
    this.engine.close();
  }
}
