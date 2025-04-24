import { ChatModel } from "@/model/chat/ChatModel";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { Agent } from "../Agent";
import { Context } from "../context/Context";
import { EngineOptions } from "../types/agent";
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

  constructor(agent: Agent) {
    this.agent = agent;
    this.context = this.agent.context;
    this.model = ChatModel.create(agent.props.models?.text);
    this.initPromise = this.init(agent).then(() => {
      this.isInitialized = true;
    });
  }

  async init(agent: Agent) {
    const props = agent.props;
    this.context = new Context(agent);
    this.model
      .setTemperature(props.configs?.temperature || 1)
      .setTools(await this.generateTools(agent));
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
    props?: EngineOptions,
  ): Promise<{ content: string }> {
    console.log(
      `执行 ${input}, images: ${props?.images}, extra: ${props?.extra}`,
    );
    // 确保初始化已完成
    await this.ensureInitialized();
    throw new Error("Not implemented");
  }

  stop() {
    this.model.stop();
  }

  close() {
    this.model.stop();
  }

  /** 创建 Engine 实例 */
  static create(agent: Agent): Engine {
    const engine = EngineManager.create(agent);
    return engine;
  }

  private async generateTools(agent: Agent) {
    const tools = [
      ...(await ToolsHandler.transformAgentToolToModelFormat(
        agent.props.tools,
      )),
      ...(await ToolsHandler.transformWorkflowToModelFormat(
        agent.props.workflows || [],
      )),
      ...(await ToolsHandler.transformModelToModelFormat(agent.props.models)),
      ...(await ToolsHandler.transformAgentToModelFormat(agent.props.agents)),
      ...(await ToolsHandler.transformMCPToModelFormat(agent.props.mcps)),
      ...(await ToolsHandler.transformKnowledgeToModelFormat(
        agent.props.knowledges || [],
      )),
      ...(await ToolsHandler.transformSkillToModelFormat(agent.props.skills)),
    ];
    return tools;
  }
}
