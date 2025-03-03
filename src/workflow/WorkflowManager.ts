import { Echo } from "echo-state";
import { gen } from "@/utils/generator";
import { WorkflowProps } from "./types/nodes";
import { Workflow } from "./Workflow";
import { CronExpressionParser } from "cron-parser";

/* 工作流管理器 */
export class WorkflowManager {
  /* 工作流内容 */
  static store = new Echo<Record<string, WorkflowProps>>(
    {},
    {
      name: "workflows",
      storage: "indexedDB",
    },
  );

  /**
   * 任务存储实例
   * 使用 Echo 状态管理库实现持久化存储
   * @private
   */
  private static taskStore = new Echo<Record<string, Task>>({});

  /**
   * 最大重试次数
   * @private
   */
  private static MAX_RETRY_COUNT = 3;

  /**
   * 重试延迟（毫秒）
   * @private
   */
  private static RETRY_DELAY = 1000;

  /* 工作流状态使用 */
  static use = WorkflowManager.store.use.bind(WorkflowManager.store);

  /**
   * 计算下一次运行时间
   * @param cronExpression cron 表达式
   * @returns {Date} 下一次运行的时间
   * @throws {Error} 当 cron 表达式无效时抛出错误
   * @private
   */
  private static calculateNextRun(cronExpression: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      console.error("无效的 cron 表达式:", error);
      throw error;
    }
  }

  /**
   * 创建精确的定时器
   * @private
   */
  private static createPreciseTimer(
    taskId: string,
    cronExpr: string,
    onTick: () => Promise<void>,
  ): NodeJS.Timeout {
    const scheduleNextRun = () => {
      try {
        const nextRun = this.calculateNextRun(cronExpr);
        const now = new Date();
        const delay = nextRun.getTime() - now.getTime();

        return setTimeout(async () => {
          try {
            await onTick();
            // 重置重试计数
            const task = this.taskStore.current[taskId];
            if (task) {
              task.retryCount = 0;
              task.lastError = undefined;
            }
          } catch (error) {
            console.error(`执行任务[${taskId}]失败:`, error);
            // 处理重试逻辑
            const task = this.taskStore.current[taskId];
            if (task) {
              task.retryCount = (task.retryCount || 0) + 1;
              task.lastError = error as Error;

              if (task.retryCount <= this.MAX_RETRY_COUNT) {
                console.log(`准备第 ${task.retryCount} 次重试...`);
                setTimeout(() => onTick(), this.RETRY_DELAY * task.retryCount);
              }
            }
          } finally {
            // 无论成功失败，都调度下一次执行
            const newTimer = scheduleNextRun();
            // 更新定时器引用
            const currentTask = this.taskStore.current[taskId];
            if (currentTask) {
              const index = currentTask.timers.findIndex((t) => t === timer);
              if (index !== -1) {
                currentTask.timers[index] = newTimer;
              }
            }
          }
        }, Math.max(0, delay));
      } catch (error) {
        console.error(`调度任务[${taskId}]失败:`, error);
        return setTimeout(() => scheduleNextRun(), this.RETRY_DELAY);
      }
    };

    const timer = scheduleNextRun();
    return timer;
  }

  /**
   * 调度一个新的定时任务
   * @param id 任务ID
   * @param cronExpressions cron 表达式（可以包含多个表达式，每行一个）
   * @returns {Promise<boolean>} 是否成功调度
   */
  static async schedule(id: string, cronExpressions: string): Promise<boolean> {
    try {
      // 如果任务已存在，先停止它
      await this.unschedule(id);

      const schedules = cronExpressions
        .split("\n")
        .map((expr) => expr.trim())
        .filter((expr) => expr !== "");

      if (schedules.length === 0) {
        console.error("没有有效的 cron 表达式");
        return false;
      }

      const timers: NodeJS.Timeout[] = [];
      const nextRunTimes: Date[] = [];

      // 为每个 cron 表达式创建定时器
      schedules.forEach((cronExpr) => {
        try {
          const nextRun = this.calculateNextRun(cronExpr);
          nextRunTimes.push(nextRun);

          const timer = this.createPreciseTimer(id, cronExpr, async () => {
            console.log(`触发任务[${id}]`);
            await this.executeWorkflow(id);
          });

          timers.push(timer);
        } catch (error) {
          console.error(`为表达式 ${cronExpr} 创建定时器失败:`, error);
        }
      });

      // 保存任务信息
      this.taskStore.set((state) => ({
        ...state,
        [id]: {
          id,
          schedules,
          timers,
          nextRunTime:
            nextRunTimes.length > 0
              ? new Date(Math.min(...nextRunTimes.map((d) => d.getTime())))
              : undefined,
          retryCount: 0,
        },
      }));

      return true;
    } catch (error) {
      console.error("调度任务失败:", error);
      return false;
    }
  }

  /**
   * 取消一个定时任务的调度
   * @param id 任务ID
   * @returns {Promise<void>}
   */
  static async unschedule(id: string): Promise<void> {
    const task = this.taskStore.current[id];
    if (task) {
      // 清除所有定时器
      task.timers.forEach((timer) => clearInterval(timer));
      // 从存储中移除任务
      this.taskStore.delete(id);
      console.log(`已取消任务[${id}]`);
    }
  }

  /**
   * 检查任务是否已被调度
   * @param id 任务ID
   * @returns {boolean} 是否已被调度
   */
  static isScheduled(id: string): boolean {
    return id in this.taskStore.current;
  }

  /**
   * 获取所有已调度的任务ID列表
   * @returns {string[]} 任务ID数组
   */
  static getScheduledTasks(): string[] {
    return Object.keys(this.taskStore.current);
  }

  /**
   * 初始化所有已保存的定时任务
   * @returns {Promise<void>}
   */
  static async initScheduledTasks(): Promise<void> {
    try {
      await this.store.ready();
      const workflows = Object.values(await this.store.getCurrent());

      // 并行初始化定时任务
      await Promise.all(
        workflows
          .filter(
            (workflow) => workflow.schedule?.enabled && workflow.schedule.cron,
          )
          .map((workflow) =>
            this.schedule(workflow.id, workflow.schedule!.cron),
          ),
      );
    } catch (error) {
      console.error("初始化定时任务失败:", error);
    }
  }

  static create(workflow: WorkflowProps) {
    if (this.store.current[workflow.id]) {
      return false;
    }
    const now = new Date().toISOString();
    const id = gen.id();
    const newWorkflow = {
      ...workflow,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set({
      ...this.store.current,
      [id]: newWorkflow,
    });
    return newWorkflow;
  }

  /**
   * 保存工作流
   * @param workflow 工作流数据
   */
  static async update(workflow: WorkflowProps) {
    const now = new Date().toISOString();
    await this.store.ready();
    const existingWorkflow = this.store.current[workflow.id];
    if (!existingWorkflow) {
      console.log("工作流不存在");
      return false;
    }

    // 如果定时配置发生变化，需要更新定时任务
    const scheduleChanged =
      workflow.schedule?.enabled !== existingWorkflow.schedule?.enabled ||
      workflow.schedule?.cron !== existingWorkflow.schedule?.cron;

    if (scheduleChanged) {
      if (workflow.schedule?.enabled && workflow.schedule.cron) {
        await this.schedule(workflow.id, workflow.schedule.cron);
      } else {
        await this.unschedule(workflow.id);
      }
    }

    const updatedWorkflow = {
      ...existingWorkflow,
      ...workflow,
      updatedAt: now,
    };

    this.store.set({
      ...this.store.current,
      [workflow.id]: updatedWorkflow,
    });
    return updatedWorkflow;
  }

  /**
   * 获取工作流
   * @param id 工作流ID
   */
  static async get(id: string): Promise<WorkflowProps | undefined> {
    await this.store.ready();
    return this.store.current[id];
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   */
  static async delete(id: string) {
    const workflow = this.store.current[id];
    if (workflow) {
      // 如果工作流有定时任务，需要先取消
      await this.unschedule(id);
      this.store.delete(id);
    }
  }

  /**
   * 执行工作流
   * @param id 工作流ID
   */
  static async executeWorkflow(id: string) {
    try {
      const workflow = await Workflow.create(id);
      const result = await workflow.execute();
      console.log(
        `执行工作流[${id}]结果:时间：${new Date().toLocaleString()} ${JSON.stringify(
          result,
        )}`,
      );
      return result;
    } catch (error) {
      console.error(`执行工作流[${id}]失败:`, error);
      throw error;
    }
  }
}

/**
 * 定时任务接口
 */
interface Task {
  id: string;
  schedules: string[];
  timers: NodeJS.Timeout[];
  nextRunTime?: Date;
  retryCount?: number;
  lastError?: Error;
}

/* 初始化所有定时任务 */
WorkflowManager.initScheduledTasks();
