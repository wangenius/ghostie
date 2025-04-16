import {
  AgentChatOptions,
  AgentMarketProps,
  AgentProps,
} from "@/agent/types/agent";
import { AGENT_DATABASE } from "@/assets/const";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import { Engine } from "./engine/Engine";
import { supabase } from "@/utils/supabase";

export const DEFAULT_AGENT: AgentProps = {
  id: "",
  name: "",
  system: "",
  tools: [],
  mcps: [],
  engine: "react",
  knowledges: [],
  workflows: [],
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

  public async uploadToMarket() {
    // 上传到 Supabase
    const { error } = await supabase.from("agents").insert({
      id: this.props.id,
      name: this.props.name,
      description: this.props.description || this.props.system,
      body: this.props,
    });
    if (error) {
      throw error;
    }
    return;
  }

  static async fetchMarketData(
    page: number = 1,
    limit: number = 10,
  ): Promise<AgentMarketProps[]> {
    // 获取当前页数据
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw error;
    }
    console.log(data);
    return (data as AgentMarketProps[]) || [];
  }

  static async installFromMarket(data: AgentMarketProps) {
    /* 如果有plugins、workflow、或者mcp时，先检查档期啊你是否含有，如果没有需要去市场安装。 */
    // const { tools, workflows, mcps } = data.body;

    /* 创建代理 */
    const agent = new Agent(data.body);

    /* 保存代理 */
    AgentStore.set({
      [data.id]: agent.props,
    });
    return agent;
  }

  /* 从市场卸载 */
  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }
}
