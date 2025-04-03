import { AgentProps } from "@/agent/types/agent";
import { ChatModel } from "@/model/text/ChatModel";
import { PluginManager } from "@/plugin/PluginManager";
import { ToolProps } from "@/plugin/plugin";
import { EngineManager } from "./EngineManager";
import { TOOL_NAME_SPLIT } from "@/assets/const";

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
  /* 名称 */
  name: string;
  /* 描述 */
  description: string = "";
  /* 模型 */
  model: ChatModel;

  /* 内存 */
  protected memory: Memory;
  /* 执行上下文 */
  protected context: ExecutionContext;

  constructor(agent?: AgentProps) {
    this.name = agent?.name || "default";
    this.model = ChatModel.create(agent?.models?.text)
      .setAgent(agent?.id || "")
      .setTemperature(agent?.models?.text?.temperature || 1)
      .setTools(this.parseTools(agent?.tools || []))
      .setKnowledge(agent?.knowledges || []);

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

  /* 获取上下文 */
  protected getContext(): ExecutionContext {
    return this.context;
  }

  /* 获取当前状态 */
  protected async current() {
    return {
      context: this.context,
      isRunning: this.memory.isRunning,
    };
  }

  /* 解析工具 */
  private parseTools(tools: string[]): ToolProps[] {
    return Object.values(PluginManager.current)
      .flatMap((plugin) =>
        plugin.tools.map((tool) => ({
          ...tool,
          plugin: plugin.id,
          name: `${tool.name}${TOOL_NAME_SPLIT}${plugin.id}`,
          pluginName: plugin.name,
        })),
      )
      .filter((tool) => tools.includes(tool.name));
  }

  /* 执行 */
  async execute(input: string): Promise<{ content: string }> {
    console.log(`${this.name} 执行 ${input}`);
    throw new Error("Not implemented");
  }

  stop() {
    this.model.stop();
  }

  getDescription() {
    return this.description;
  }

  /** 创建 Engine 实例 */
  static create(agent?: AgentProps): Engine {
    return EngineManager.create(agent);
  }
}
