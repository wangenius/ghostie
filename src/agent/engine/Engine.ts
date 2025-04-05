import { TOOL_NAME_SPLIT } from "@/assets/const";
import { ChatModel } from "@/model/text/ChatModel";
import { ToolProps } from "@/plugin/types";
import { Agent } from "../Agent";
import { EngineManager } from "./EngineManager";
import { ToolPlugin } from "@/plugin/ToolPlugin";
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
    this.model = ChatModel.create(props.models?.text)
      .system(props.system)
      .setAgent(props.id || "")
      .setTemperature(props.models?.text?.temperature || 1)
      .setTools(await this.parseTools(props.tools || []))
      .setKnowledge(props.knowledges || []);
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

  /* 解析工具 */
  private async parseTools(tools: string[]): Promise<ToolProps[]> {
    const parsedTools: ToolProps[] = [];
    for (const item of tools) {
      const [toolName, pluginId] = item.split(TOOL_NAME_SPLIT);
      console.log(pluginId, toolName);
      const plugin = await ToolPlugin.get(pluginId);
      const tool = plugin.props.tools.find((tool) => tool.name === toolName);
      if (tool) {
        parsedTools.push({
          ...tool,
          plugin: plugin.props.id,
          name: `${tool.name}${TOOL_NAME_SPLIT}${plugin.props.id}`,
        });
      }
    }

    return parsedTools;
  }

  /* 执行 */
  async execute(input: string): Promise<{ content: string }> {
    console.log(`执行 ${input}`);
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
