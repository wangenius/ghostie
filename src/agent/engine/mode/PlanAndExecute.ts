import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";
import { Agent } from "@/agent/Agent";
export class PlanAndExecute extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string) {
    try {
      /* 重置上下文 */
      this.context.reset();
      this.context.pushMessage({
        role: "user",
        content: `基于用户输入"${input}"，请制定一个详细的执行计划。
  计划应包含：
  1. 总体目标描述
  2. 具体执行步骤
  3. 每个步骤的预期输出
  4. 步骤之间的依赖关系`,
        created_at: Date.now(),
      });
      await this.model.stream(this.context.getCompletionMessages());

      // 3. 执行阶段
      let MAX_STEPS = SettingsManager.getReactMaxIterations();

      // 4. 总结阶段
      const summaryPrompt =
        this.context.getLastMessage().content.length >= MAX_STEPS
          ? "已达到最大步骤数限制。请基于已完成的步骤生成总结报告。"
          : "所有计划步骤已完成。请生成完整的执行总结报告。";

      this.context.pushMessage({
        role: "user",
        content: `${summaryPrompt}
  ${this.context.getLastMessage().content}
  
  请提供：
  1. 总体执行情况
  2. 关键成果总结
  3. 遇到的主要问题
  4. 后续建议`,
        created_at: Date.now(),
      });
      await this.model.stream(this.context.getCompletionMessages());

      return this.context.getLastMessage();
    } catch (error: any) {
      // 5. 错误处理
      console.error("Plan execution error:", error);
      this.context.pushMessage({
        role: "user",
        content: `执行过程中遇到错误：${error.message}
  ${this.context.getLastMessage().content}
  
  请提供：
  1. 错误原因分析
  2. 当前执行状态
  3. 恢复建议
  4. 预防措施`,
        created_at: Date.now(),
      });
      await this.model.stream(this.context.getCompletionMessages());

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
