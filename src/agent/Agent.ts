import { AgentProps } from "@/agent/types/agent";
import { gen } from "@/utils/generator";
import { Echo, EchoItem, EchoList } from "echo-state";
import { Engine } from "./engine/Engine";

export const DEFAULT_AGENT: AgentProps = {
  id: "",
  name: "",
  system: "",
  tools: [],
  engine: "react",
};
export const AGENT_DATABASE = "agents";
class AgentListClass extends EchoList<AgentProps> {
  constructor() {
    super(AGENT_DATABASE);
  }
}

export class Agent extends EchoItem<AgentProps> {
  /* 框架 */
  engine: Engine;
  static list = new AgentListClass();

  /** 构造函数
   */
  constructor(agent?: AgentProps) {
    super(AGENT_DATABASE);
    if (agent) {
      this.store
        .indexed({
          database: AGENT_DATABASE,
          name: agent.id,
        })
        .ready(agent);
    }
    this.engine = Engine.create(agent);
  }

  /* 获取机器人ID */
  async getId() {
    const store = await this.store.getCurrent();
    if (!store) {
      throw new Error("Agent ID not found");
    }
    return store.id;
  }

  get model() {
    return this.engine.model;
  }

  /* 代理数据 */
  async props() {
    const store = await this.store.getCurrent();
    return store;
  }

  /* 关闭机器人 */
  async close() {
    this.store.temporary().reset();
    this.engine.stop();
  }

  /** 创建代理 */
  static async create(config: Partial<AgentProps> = {}): Promise<Agent> {
    const id = gen.id();
    /* 创建代理 */
    const agent = new Agent({
      ...DEFAULT_AGENT,
      ...config,
      id,
    });
    Agent.list.set({
      ...Agent.list.current,
      [id]: {
        ...DEFAULT_AGENT,
        ...config,
        id,
      },
    });
    return agent;
  }

  indexed(id: string) {
    this.store.indexed({
      database: AGENT_DATABASE,
      name: id,
    });
  }

  /* 获取机器人 */
  static async get(id: string): Promise<Agent> {
    const agent = Agent.list.current()[id];
    if (!agent) {
      throw new Error("Agent ID not found");
    }
    return new Agent(agent);
  }

  /* 更新机器人元数据 */
  async updateMeta(agent: Partial<Omit<AgentProps, "id">>) {
    const now = new Date().toISOString();
    const id = await this.getId();
    const existingAgent = Agent.list.current()[id];
    if (!existingAgent) {
      throw new Error("Agent ID not found");
    }

    const updatedAgent = {
      ...existingAgent,
      ...agent,
      updatedAt: now,
    };

    this.store.set((prev) => ({
      ...prev,
      ...agent,
    }));

    Agent.list.set({
      ...Agent.list.current,
      [id]: updatedAgent,
    });
    return updatedAgent;
  }

  /* 更新工作流 */
  async updateWorkflows(workflows: string[]) {
    this.store.set((prev) => ({
      ...prev,
      workflows,
    }));
  }

  /* 删除机器人 */
  static async delete(id: string) {
    Agent.list.delete(id);
    new Echo<AgentProps | null>(null)
      .indexed({
        database: AGENT_DATABASE,
        name: id,
      })
      .discard();
  }

  /* 机器人对话 */
  public async chat(input: string) {
    this.store.set((prev) => ({ ...prev, isRunning: true }));
    try {
      return await this.engine.execute(input);
    } finally {
      this.store.set((prev) => ({ ...prev, isRunning: false }));
    }
  }

  /* 停止机器人 */
  public stop() {
    this.store.set((prev) => ({ ...prev, isRunning: false }));
    this.model.stop();
  }
}
