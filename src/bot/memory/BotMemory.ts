import {
  ThoughtChain,
  TaskPlan,
  TaskStep,
  ActionResult,
} from "@/bot/types/memory";
import { gen } from "@/utils/generator";

export enum PlanStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  BLOCKED = "blocked",
}

export interface PlanValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

/* Agent上下文 */
export class BotMemory {
  /* 思维链 */
  private thoughtChains: ThoughtChain[] = [];
  /* 目标 */
  private plan: TaskPlan | null = null;
  /* 当前迭代 */
  private currentIteration: number = 0;
  /* 当前执行的步骤索引 */
  private currentStepIndex: number = 0;
  /* 计划验证结果 */
  private planValidation: PlanValidation | null = null;
  /* 执行上下文数据 */
  private executionContext: Map<string, any> = new Map();

  constructor() {}

  /**
   * 记录思维链
   * @param thought 思维
   * @param action 行动
   * @param result 结果
   * @param observation 观察
   */
  recordChain(thought: string, action: any, observation: string): void {
    const chain: ThoughtChain = {
      id: gen.id(),
      timestamp: new Date().toLocaleString(),
      thought,
      action,
      observation,
    };
    this.thoughtChains.push(chain);
  }

  // 更新计划
  setPlan(plan: TaskPlan): void {
    this.plan = plan;
  }

  // 更新任务状态
  updateTaskStatus(result: ActionResult, subtaskId: string): void {
    if (!this.plan) return;

    const subtask = this.plan.steps.find(
      (step: TaskStep) => step.id === subtaskId,
    );
    if (subtask) {
      subtask.completed = result.success;
      subtask.result = result.output;
    }

    const allCompleted = this.plan.steps.every(
      (step: TaskStep) => step.completed,
    );
    const anyFailed = this.plan.steps.some(
      (step: TaskStep) => step.completed === false,
    );

    this.plan.status = allCompleted
      ? "completed"
      : anyFailed
      ? "failed"
      : "in_progress";
  }

  /**
   * 设置计划验证结果
   */
  setPlanValidation(validation: PlanValidation): void {
    this.planValidation = validation;
  }

  /**
   * 获取计划验证结果
   */
  getPlanValidation(): PlanValidation | null {
    return this.planValidation;
  }

  /**
   * 获取当前执行的步骤
   */
  getCurrentStep(): TaskStep | null {
    if (!this.plan || !this.plan.steps.length) return null;
    return this.plan.steps[this.currentStepIndex];
  }

  /**
   * 移动到下一个步骤
   */
  moveToNextStep(): boolean {
    if (!this.plan || this.currentStepIndex >= this.plan.steps.length - 1) {
      return false;
    }
    this.currentStepIndex++;
    return true;
  }

  /**
   * 存储执行上下文数据
   */
  setExecutionContext(key: string, value: any): void {
    this.executionContext.set(key, value);
  }

  /**
   * 获取执行上下文数据
   */
  getExecutionContext(key: string): any {
    return this.executionContext.get(key);
  }

  /**
   * 检查计划是否完成
   */
  isPlanCompleted(): boolean {
    return this.plan?.status === PlanStatus.COMPLETED;
  }

  /**
   * 重置上下文
   */
  reset(): void {
    this.thoughtChains = [];
    this.plan = null;
    this.currentIteration = 0;
    this.currentStepIndex = 0;
    this.planValidation = null;
    this.executionContext.clear();
  }

  /**
   * 生成增强的上下文信息
   */
  generate_context_info(): string {
    const maxChains = 2;
    const recentChains = this.thoughtChains.slice(-maxChains);

    let contextInfo = "";

    // 添加计划信息
    if (this.plan) {
      contextInfo += `
计划概述:
- 描述: ${this.plan.description}
- 状态: ${this.plan.status}
- 当前步骤: ${this.currentStepIndex + 1}/${this.plan.steps.length}

子任务进度:
${this.plan.steps
  .map((step: TaskStep, index: number) => {
    const status = step.completed
      ? "✓ 已完成"
      : index === this.currentStepIndex
      ? "⚡ 执行中"
      : "⚪ 待执行";
    return `${index + 1}. ${status} - ${step.description}`;
  })
  .join("\n")}`;
    }

    // 添加验证信息
    if (this.planValidation) {
      contextInfo += `\n\n计划验证:
${this.planValidation.isValid ? "✓ 验证通过" : "⚠ 存在问题"}
${
  this.planValidation.issues.length
    ? "问题:\n" + this.planValidation.issues.map((i) => `- ${i}`).join("\n")
    : ""
}
${
  this.planValidation.suggestions.length
    ? "建议:\n" +
      this.planValidation.suggestions.map((s) => `- ${s}`).join("\n")
    : ""
}`;
    }

    // 添加执行记录
    if (recentChains.length) {
      contextInfo +=
        "\n\n最近执行记录:\n" +
        recentChains
          .map(
            (chain) => `时间: ${chain.timestamp}
思考: ${chain.thought}
行动: ${JSON.stringify(chain.action, null, 2)}
执行结果: ${JSON.stringify(chain.action.result, null, 2)}
观察: ${chain.observation}`,
          )
          .join("\n\n");
    }

    return contextInfo;
  }

  // Getters
  getThoughtChains(): ThoughtChain[] {
    return this.thoughtChains;
  }

  getCurrentPlan(): TaskPlan | null {
    return this.plan;
  }

  getCurrentIteration(): number {
    return this.currentIteration;
  }

  incrementIteration(): void {
    this.currentIteration++;
  }
}
