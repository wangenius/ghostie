import {
  ThoughtChain,
  TaskPlan,
  TaskStep,
  ActionResult,
} from '@/common/types/agent';
import { gen } from '@common/lib/generator';

/* Agent上下文 */

/* Agent上下文 */
export class Context {
  /* 思维链 */
  private thoughtChains: ThoughtChain[] = [];
  /* 目标 */
  private plan: TaskPlan | null = null;
  /* 当前迭代 */
  private currentIteration: number = 0;

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
      (step: TaskStep) => step.id === subtaskId
    );
    if (subtask) {
      subtask.completed = result.success;
      subtask.result = result.output;
    }

    const allCompleted = this.plan.steps.every(
      (step: TaskStep) => step.completed
    );
    const anyFailed = this.plan.steps.some(
      (step: TaskStep) => step.completed === false
    );

    this.plan.status = allCompleted
      ? 'completed'
      : anyFailed
      ? 'failed'
      : 'in_progress';
  }

  /**
   * 构建上下文信息
   * @param input 输入
   * @returns 上下文信息
   */
  generate_context_info(): string {
    /* 最大思维链数量 */
    const maxChains = 2;
    /* 最近执行记录 */
    const recentChains = this.thoughtChains.slice(-maxChains);

    return `
${
  this.plan
    ? `
总任务: ${this.plan.description}
总任务状态: ${this.plan.status}
子任务进度: ${this.plan.steps
        .map(
          (step: TaskStep) =>
            `- ${step.description} (${step.completed ? '已完成' : '未完成'})`
        )
        .join('\n')}`
    : ''
}
${recentChains.length > 0 ? '最近执行记录:' : ''}
${recentChains
  .map(
    (chain) =>
      `时间: ${chain.timestamp}
思考: ${chain.thought}
行动: ${JSON.stringify(chain.action, null, 2)}
执行结果: ${JSON.stringify(chain.action.result, null, 2)}
观察: ${chain.observation}`
  )
  .join('\n\n')}`;
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

  reset(): void {
    this.thoughtChains = [];
    this.plan = null;
    this.currentIteration = 0;
  }
}
