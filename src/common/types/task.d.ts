/** 定义任务事件类型，用于任务执行过程中的事件通知 */
export type TaskStepEventType =
  | "step:start" // 步骤开始
  | "step:complete" // 步骤完成
  | "step:fail" // 步骤失败
  | "step:retry" // 步骤重试
  | "step:pause" // 步骤暂停
  | "step:resume" // 步骤恢复
  | "task:start" // 任务开始
  | "task:complete" // 任务完成
  | "task:fail" // 任务失败
  | "task:pause" // 任务暂停
  | "task:resume"; // 任务恢复

/** 任务状态 */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

/** 步骤状态 */
export type StepStatus =
  | "pending" // 等待执行
  | "running" // 正在执行
  | "completed" // 执行完成
  | "failed" // 执行失败
  | "cancelled"; // 已取消

/**
 * Task 任务配置接口
 * @property name - 任务名称
 * @property description - 任务描述(可选)
 */
export interface TaskConfig {
  name: string;
  description?: string;
}
/**
 * 步骤配置接口
 * @property retry - 重试配置
 * @property timeout - 超时时间
 * @property onCancel - 取消回调函数
 */
export interface StepConfig {
  retry?: StepRetryConfig;
  timeout?: number;
  onCancel?: () => void;
}
/**
 * 执行器类型 - 定义步骤的执行逻辑
 * @template TInput - 输入参数类型
 * @template TOutput - 输出结果类型
 * @param input - 执行器的输入参数
 * @param this - 执行器上下文, 当前Step实例
 * @returns Promise<TOutput> - 异步执行结果
 */
export type StepExecutor<
  TInput = any,
  TOutput = any,
  TStep = Step<TInput, TOutput>
> = (data: TInput, this: TStep) => Promise<TOutput>;

/**
 * 重试配置接口
 * @property maxAttempts - 最大重试次数
 * @property initialDelay - 初始重试延迟时间(毫秒)
 * @property maxDelay - 最大重试延迟时间(毫秒)
 * @property backoffFactor - 重试延迟时间的增长因子
 */
export interface StepRetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Task 事件接口
 * @property type - 事件类型
 * @property stepId - 相关步骤ID(可选)
 * @property timestamp - 事件发生时间戳
 * @property data - 事件相关数据(可选)
 * @property error - 错误信息(可选)
 */
export interface TaskEvent {
  type: TaskStepEventType;
  stepId?: string;
  timestamp: number;
  data?: any;
  error?: Error;
}

/**
 * Task 事件监听器类型
 * @param event - Task事件角色
 */
export type TaskEventListener = (event: TaskEvent) => void;

/**
 * 步骤状态接口
 * @property id - 步骤唯一标识
 * @property name - 步骤名称
 * @property status - 步骤执行状态
 * @property result - 执行结果(可选)
 * @property error - 错误信息(可选)
 * @property startTime - 开始执行时间(可选)
 * @property endTime - 结束执行时间(可选)
 */
export interface StepState {
  id: string;
  name: string;
  status: StepStatus;
  result?: any;
  error?: Error;
  startTime?: number;
  endTime?: number;
}

/**
 * 步骤执行结果接口
 * @template TOutput - 输出结果类型
 * @property success - 是否执行成功
 * @property output - 执行输出结果
 * @property error - 错误信息(可选)
 * @property checkResult - 结果检查信息(可选)
 */
export interface StepResult<TOutput = any> {
  success: boolean;
  output?: TOutput;
  error?: Error;
  checkResult?: {
    satisfied: boolean;
    reason: string;
    nextInput?: any;
  };
}
