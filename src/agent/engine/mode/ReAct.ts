import { Agent } from "@/agent/Agent";
import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";
/* ReAct 引擎 */
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

      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();
      // 思考和行动阶段：让模型生成响应和可能的工具调用
      this.model.Message.setSystem(this.agent.props.system);
      this.model.Message.push([
        {
          role: "user",
          content: input,
          created_at: Date.now(),
        },
      ]);
      while (this.memory.isRunning && iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await this.model.stream();

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool) {
          break;
        }

        // 重置输入为空,让模型基于历史消息继续对话
        input = "";
      }

      // 如果达到最大迭代次数，生成一个说明
      if (iterations >= MAX_ITERATIONS) {
        this.model.Message.push([
          {
            role: "user",
            content: "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
            created_at: Date.now(),
          },
        ]);
        await this.model.stream();
      }

      return this.model.Message.list[this.model.Message.list.length - 1];
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
