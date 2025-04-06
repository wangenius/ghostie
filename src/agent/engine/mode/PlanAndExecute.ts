import { Agent } from "@/agent/Agent";
import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";

export class PlanAndExecute extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string) {
    try {
      const context = this.getContext();
      /* 重置上下文 */
      context.reset();
      this.model.Message.setSystem(this.agent.props.system);
      this.model.Message.push([
        {
          role: "user",
          content: `基于用户输入"${input}"，请制定一个详细的执行计划。
  计划应包含：
  1. 总体目标描述
  2. 具体执行步骤
  3. 每个步骤的预期输出
  4. 步骤之间的依赖关系`,
          created_at: Date.now(),
        },
      ]);
      await this.model.stream();

      // 3. 执行阶段
      let MAX_STEPS = SettingsManager.getReactMaxIterations();

      while (
        this.getMemory().isRunning &&
        !context.isPlanCompleted() &&
        context.getCurrentIteration() < MAX_STEPS
      ) {
        const currentStep = context.getCurrentStep();
        if (!currentStep) break;

        // 3.1 执行当前步骤
        this.model.Message.push([
          {
            role: "user",
            content: `执行当前步骤：${currentStep.description}`,
            created_at: Date.now(),
          },
        ]);
        const stepResponse = await this.model.stream();

        // 3.2 评估步骤执行结果
        this.model.Message.push([
          {
            role: "user",
            content: `评估步骤执行结果：
  1. 检查输出是否符合预期
  2. 验证执行质量
  3. 更新执行状态
  ${stepResponse.body}`,
            created_at: Date.now(),
          },
        ]);

        const evaluationResponse = await this.model.stream();

        // 3.3 更新执行上下文
        context.setExecutionContext(`step_${currentStep.id}_result`, {
          output: stepResponse.body,
          evaluation: evaluationResponse.body,
        });

        // 3.4 更新任务状态
        context.updateTaskStatus(
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
        if (!context.moveToNextStep()) {
          break;
        }

        context.incrementIteration();
      }

      // 4. 总结阶段
      const summaryPrompt =
        context.getCurrentIteration() >= MAX_STEPS
          ? "已达到最大步骤数限制。请基于已完成的步骤生成总结报告。"
          : "所有计划步骤已完成。请生成完整的执行总结报告。";

      this.model.Message.push([
        {
          role: "user",
          content: `${summaryPrompt}
  ${context.generate_context_info()}
  
  请提供：
  1. 总体执行情况
  2. 关键成果总结
  3. 遇到的主要问题
  4. 后续建议`,
          created_at: Date.now(),
        },
      ]);
      await this.model.stream();

      return this.model.Message.list[this.model.Message.list.length - 1];
    } catch (error: any) {
      // 5. 错误处理
      console.error("Plan execution error:", error);
      const context = this.getContext();
      this.model.Message.push([
        {
          role: "user",
          content: `执行过程中遇到错误：${error.message}
  ${context.generate_context_info()}
  
  请提供：
  1. 错误原因分析
  2. 当前执行状态
  3. 恢复建议
  4. 预防措施`,
          created_at: Date.now(),
        },
      ]);
      await this.model.stream();

      throw error;
    }
  }
}

// 注册 PlanAndExecute
EngineManager.register("plan-and-execute", {
  name: "PlanAndExecute",
  description:
    "PlanAndExecute 是一种基于计划的执行模式，它允许模型在对话中生成计划，并根据计划执行工具调用。",
  create: (agent: Agent) => new PlanAndExecute(agent),
});
