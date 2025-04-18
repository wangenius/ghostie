import { ChatModel } from "@/model/chat/ChatModel";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { Agent } from "../Agent";
import { EngineOptions } from "../types/agent";
import { EngineManager } from "./EngineManager";

/** 执行上下文接口 */
export interface ExecutionContext {
  /** 重置上下文 */
  reset(): void;
  /** 获取当前迭代次数 */
  getCurrentIteration(): number;
  /** 增加迭代次数 */
  incrementIteration(): void;
  /** 生成上下文信息 */
  generate_context_info(): string;
  /** 设置执行上下文 */
  setExecutionContext(key: string, value: any): void;
  /** 更新任务状态 */
  updateTaskStatus(
    status: { success: boolean; output: string; observation: string },
    stepId: string,
  ): void;
  /** 移动到下一步 */
  moveToNextStep(): boolean;
  /** 检查计划是否完成 */
  isPlanCompleted(): boolean;
  /** 获取当前步骤 */
  getCurrentStep(): { id: string; description: string } | undefined;
}

/** 内存接口 */
export interface Memory {
  /** 重置内存 */
  reset(): void;
  /** 是否正在运行 */
  isRunning: boolean;
}

/* Agent 框架父类 */
export class Engine {
  /* 代理 */
  agent: Agent;
  /* 模型 */
  model: ChatModel = null as any;
  /* 内存 */
  protected memory: Memory = { reset: () => {}, isRunning: true };

  /* 执行上下文 */
  protected context: ExecutionContext = {
    reset: () => {},
    getCurrentIteration: () => 0,
    incrementIteration: () => {},
    generate_context_info: () => "",
    setExecutionContext: () => {},
    updateTaskStatus: () => {},
    moveToNextStep: () => false,
    isPlanCompleted: () => false,
    getCurrentStep: () => undefined,
  };

  /* 初始化完成标志 */
  private isInitialized: boolean = false;
  /* 初始化Promise */
  private initPromise: Promise<void> | null = null;

  constructor(agent: Agent) {
    this.agent = agent;
    this.initPromise = this.init(agent).then(() => {
      this.isInitialized = true;
    });
  }

  async init(agent: Agent) {
    const props = agent.props;
    this.model = ChatModel.create({
      provider: props.models?.text?.provider || "",
      name: props.models?.text?.name || "",
    });
    this.model.Message.setSystem(props.system);
    this.model.Message.setAgent(props.id || "");
    this.model
      .setTemperature(props.configs?.temperature || 1)
      .setOtherModels(props.models)
      .setTools([
        ...(await ToolsHandler.transformAgentToolToModelFormat(props.tools)),
        ...(await ToolsHandler.transformWorkflowToModelFormat(
          props.workflows || [],
        )),
        ...(await ToolsHandler.transformModelToModelFormat(props.models)),
        ...(await ToolsHandler.transformAgentToModelFormat(props.agents)),
        ...(await ToolsHandler.transformMCPToModelFormat(props.mcps)),
        ...(await ToolsHandler.transformKnowledgeToModelFormat(
          props.knowledges || [],
        )),
      ]);

    // 初始化内存和上下文
    this.memory = {
      reset: () => {},
      isRunning: true,
    };

    this.context = {
      reset: () => {},
      getCurrentIteration: () => 0,
      incrementIteration: () => {},
      generate_context_info: () => "",
      setExecutionContext: () => {},
      updateTaskStatus: () => {},
      moveToNextStep: () => false,
      isPlanCompleted: () => false,
      getCurrentStep: () => undefined,
    };
  }

  /* 等待初始化完成 */
  protected async ensureInitialized() {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  /* 获取上下文 */
  protected getContext(): ExecutionContext {
    return this.context;
  }

  protected getMemory() {
    return this.memory;
  }

  /* 执行 */
  async execute(
    input: string,
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
}
