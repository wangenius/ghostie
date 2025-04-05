import { Agent } from "@/agent/Agent";
import { MessageType } from "@/model/types/chatModel";
import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";

export class ReAct extends Engine {
  constructor(agent: Agent) {
    super(agent);
    // 初始化 ReAct 特定的内存和上下文
    this.memory = {
      reset: () => {
        this.memory.isRunning = true;
      },
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

  /* 执行 */
  async execute(input: string) {
    try {
      await this.ensureInitialized();

      // ReAct循环
      let currentInput = input || undefined;
      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();

      while (this.memory.isRunning && iterations < MAX_ITERATIONS) {
        iterations++;

        console.log(this.model);
        // 思考和行动阶段：让模型生成响应和可能的工具调用
        const response = await this.model.stream(currentInput, {
          user:
            iterations === 1 ? MessageType.USER_INPUT : MessageType.USER_HIDDEN,
          assistant: MessageType.ASSISTANT_REPLY,
          function: MessageType.TOOL_RESULT,
        });

        console.log(response);

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
            function: MessageType.TOOL_RESULT,
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
}

// 注册 ReAct
EngineManager.register("react", {
  name: "ReAct",
  description:
    "ReAct 是一种基于反应的对话模式，它允许模型在对话中生成反应，并根据反应执行工具调用。",
  create: (agent: Agent) => new ReAct(agent),
});
