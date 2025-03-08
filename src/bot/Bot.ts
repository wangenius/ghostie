import { BotProps } from "@/common/types/bot";
import { ToolProps } from "@/common/types/plugin";
import { PluginManager } from "@/plugin/PluginManager";
import { ChatModel } from "../model/ChatModel";
import { ModelManager } from "../model/ModelManager";
import { SettingsManager } from "../settings/SettingsManager";
import { BotManager } from "./BotManger";
import { Context } from "./Context";
import { Message } from "@/common/types/model";
import { MessageType } from "@/common/types/model";

/* 工具名称分隔符 */
export const TOOL_NAME_SPLIT = "-";

/* 机器人配置 */
export const defaultBot: BotProps = {
  id: "",
  name: "",
  system: "",
  model: "",
  tools: [],
  temperature: 0.5,
  mode: "ReAct",
};
/**
 * 机器人对象
 *
 * @description 机器人对象是机器人配置的实例化，用于存储机器人配置和上下文信息
 * @description 机器人对象可以用于对话、工具调用、上下文管理等
 */
export class Bot implements Omit<BotProps, "model"> {
  /* 机器人ID,存储ID */
  id: string;
  /* 机器人名称 */
  name: string;
  /* 机器人系统提示 */
  system: string;
  /* 机器人模型 */
  model: ChatModel;
  /* 机器人工具 */
  tools: string[];
  /* 机器人温度 */
  temperature: number;
  /* 机器人模式 */
  mode: "ReAct" | "Execute";
  /* 机器人上下文 */
  context: Context;
  /* 机器人运行状态 */
  private isRunning: boolean = false;
  /* 机器人配置 */
  constructor(config: BotProps = defaultBot) {
    /* 机器人ID */
    this.id = config.id;
    /* 机器人名称 */
    this.name = config.name;
    /* 机器人系统提示 */
    this.system = config.system;
    /* 机器人温度 */
    this.temperature = config.temperature;
    /* 机器人模式 */
    this.mode = config.mode;
    /* 机器人模型 */
    const model = ModelManager.get(config.model);

    // 解析工具字符串，格式为 "tool_name-plugin_name"
    const tools: ToolProps[] = Object.values(PluginManager.current)
      .flatMap((plugin) =>
        plugin.tools.map((tool) => ({
          ...tool,
          plugin: plugin.id,
          // 添加完整名称，用于匹配
          name: `${tool.name}${TOOL_NAME_SPLIT}${plugin.id}`,
          pluginName: plugin.name,
        })),
      )
      .filter((tool) => {
        return config.tools.includes(tool.name);
      });

    this.model = new ChatModel(model)
      .setBot(config.id)
      .setTemperature(config.temperature)
      .setTools(tools)
      .setKnowledge(config.knowledges || [])
      .setWorkflows(config.workflows || [])
      .system(config.system);
    this.tools = config.tools || [];
    this.context = new Context();
  }

  /* 获取机器人 */
  public static get(id: string) {
    const bot = BotManager.get(id);
    if (!bot) {
      return new Bot();
    }
    return new Bot(bot);
  }

  /* 机器人对话 */
  public async chat(input: string) {
    this.isRunning = true;
    try {
      switch (this.mode) {
        case "ReAct":
          return await this.chatReAct(input);
        case "Execute":
          return await this.chatPlan(input);
        default:
          return await this.chatReAct(input);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /* 机器人对话，使用Plan循环 */
  private async chatPlan(input: string): Promise<Message> {
    try {
      /* 重置上下文 */
      this.context.reset();

      await this.model.stream(
        `基于用户输入"${input}"，请制定一个详细的执行计划。
计划应包含：
1. 总体目标描述
2. 具体执行步骤
3. 每个步骤的预期输出
4. 步骤之间的依赖关系`,
        {
          user: MessageType.USER_INPUT,
          assistant: MessageType.ASSISTANT_REPLY,
          function: MessageType.FUNCTION_RESULT,
        },
      );

      // 3. 执行阶段
      let MAX_STEPS = SettingsManager.getReactMaxIterations();

      while (
        this.isRunning &&
        !this.context.isPlanCompleted() &&
        this.context.getCurrentIteration() < MAX_STEPS
      ) {
        const currentStep = this.context.getCurrentStep();
        if (!currentStep) break;

        // 3.1 执行当前步骤
        const stepResponse = await this.model.stream(
          `执行当前步骤：${currentStep.description}
${this.context.generate_context_info()}`,
          {
            user: MessageType.USER_HIDDEN,
            assistant: MessageType.ASSISTANT_REPLY,
            function: MessageType.FUNCTION_RESULT,
          },
        );

        // 3.2 评估步骤执行结果
        const evaluationResponse = await this.model.stream(
          `评估步骤执行结果：
1. 检查输出是否符合预期
2. 验证执行质量
3. 更新执行状态
${stepResponse.body}`,
          {
            user: MessageType.USER_HIDDEN,
            assistant: MessageType.ASSISTANT_PROCESS,
            function: MessageType.FUNCTION_RESULT,
          },
        );

        // 3.3 更新执行上下文
        this.context.setExecutionContext(`step_${currentStep.id}_result`, {
          output: stepResponse.body,
          evaluation: evaluationResponse.body,
        });

        // 3.4 更新任务状态
        this.context.updateTaskStatus(
          {
            success:
              !evaluationResponse.body.includes("失败") &&
              !evaluationResponse.body.includes("错误"),
            output: stepResponse.body,
            observation: evaluationResponse.body,
          },
          currentStep.id,
        );

        // 3.5 移动到下一步
        if (!this.context.moveToNextStep()) {
          break;
        }

        this.context.incrementIteration();
      }

      // 4. 总结阶段
      const summaryPrompt =
        this.context.getCurrentIteration() >= MAX_STEPS
          ? "已达到最大步骤数限制。请基于已完成的步骤生成总结报告。"
          : "所有计划步骤已完成。请生成完整的执行总结报告。";
      await this.model.stream(
        `${summaryPrompt}
${this.context.generate_context_info()}

请提供：
1. 总体执行情况
2. 关键成果总结
3. 遇到的主要问题
4. 后续建议`,
        {
          user: MessageType.USER_HIDDEN,
          assistant: MessageType.ASSISTANT_REPLY,
          function: MessageType.FUNCTION_RESULT,
        },
      );

      return this.model.historyMessage.list[
        this.model.historyMessage.list.length - 1
      ];
    } catch (error: any) {
      // 5. 错误处理
      console.error("Plan execution error:", error);
      await this.model.stream(
        `执行过程中遇到错误：${error.message}
${this.context.generate_context_info()}

请提供：
1. 错误原因分析
2. 当前执行状态
3. 恢复建议
4. 预防措施`,
        {
          user: MessageType.USER_HIDDEN,
          assistant: MessageType.ASSISTANT_ERROR,
          function: MessageType.FUNCTION_RESULT,
        },
      );

      throw error;
    }
  }

  /* 机器人对话，使用ReAct循环 */
  private async chatReAct(input: string) {
    try {
      /* 重置上下文 */
      this.context.reset();

      // ReAct循环
      let currentInput = input || undefined;
      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();

      while (this.isRunning && iterations < MAX_ITERATIONS) {
        iterations++;

        // 思考和行动阶段：让模型生成响应和可能的工具调用
        const response = await this.model.stream(currentInput, {
          user:
            iterations === 1 ? MessageType.USER_INPUT : MessageType.USER_HIDDEN,
          assistant: MessageType.ASSISTANT_REPLY,
          function: MessageType.FUNCTION_RESULT,
        });

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool) {
          break;
        }

        // 观察阶段：执行工具调用并获取结果
        // 工具调用的结果会自动被添加到对话历史中
        // 更新输入，让模型基于工具执行结果继续思考
        currentInput = undefined;
      }

      // 如果达到最大迭代次数，生成一个说明
      if (iterations >= MAX_ITERATIONS) {
        await this.model.stream(
          "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
          {
            user: MessageType.USER_HIDDEN,
            assistant: MessageType.ASSISTANT_REPLY,
            function: MessageType.FUNCTION_RESULT,
          },
        );
      }

      return this.model.historyMessage.list[
        this.model.historyMessage.list.length - 1
      ];
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }

  /* 停止机器人 */
  public stop() {
    this.isRunning = false;
    this.model.stop();
    this.context.reset();
  }
}
