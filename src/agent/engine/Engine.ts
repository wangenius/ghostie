import { ChatModel } from "@/model/chat/ChatModel";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { Agent } from "../Agent";
import { Context } from "../context/Context";
import { AgentInfos, ExecuteOptions } from "../types/agent";
import { EngineManager } from "./EngineManager";

/* Agent 框架父类 */
export class Engine {
  /* 代理 */
  agent: Agent;
  /* 模型 */
  model: ChatModel;
  /* 上下文 */
  context: Context;
  /* 初始化完成标志 */
  private isInitialized: boolean = false;
  /* 初始化Promise */
  private initPromise: Promise<void> | null = null;

  protected constructor(agent: Agent) {
    this.agent = agent;
    this.context = this.agent.context;
    console.log(agent.infos.models);
    this.model = ChatModel.create(agent.infos.models?.text);
    console.log(this.model);
    this.initPromise = this.init(agent).then(() => {
      this.isInitialized = true;
    });
  }
  /** 创建 Engine 实例 */
  static create(agent: Agent): Engine {
    const engine = EngineManager.create(agent);
    return engine;
  }

  async init(agent: Agent) {
    const props = agent.infos;
    this.context = agent.context;
    this.model
      .setTemperature(props.configs?.temperature || 1)
      .setTools(await this.generateTools(agent.infos));
  }

  /* 等待初始化完成 */
  protected async ensureInitialized() {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  /* Agent执行 */
  async execute(
    /* 输入 */
    input: string,
    /* 选项 */
    options?: ExecuteOptions,
  ): Promise<{ content: string }> {
    console.log(
      `执行 ${input}, images: ${options?.images}, extra: ${options?.extra}`,
    );
    await this.ensureInitialized();
    throw new Error("Not implemented");
  }

  stop() {
    this.model.stop();
  }

  close() {
    this.model.stop();
    this.context.reset();
  }

  private async generateTools(infos: AgentInfos) {
    const tools = [
      ...(await ToolsHandler.transformAgentToolToModelFormat(infos.tools)),
      ...(await ToolsHandler.transformWorkflowToModelFormat(infos.workflows)),
      ...(await ToolsHandler.transformModelToModelFormat(infos.models)),
      ...(await ToolsHandler.transformAgentToModelFormat(infos.agents)),
      ...(await ToolsHandler.transformMCPToModelFormat(infos.mcps)),
      ...(await ToolsHandler.transformKnowledgeToModelFormat(infos.knowledges)),
      ...(await ToolsHandler.transformSkillToModelFormat(infos.skills)),
    ];
    return tools;
  }
}
