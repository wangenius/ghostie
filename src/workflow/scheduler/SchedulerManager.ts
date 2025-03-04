import { WorkflowManager } from "../WorkflowManager";
import { Echo } from "echo-state";
import { CronExpressionParser } from "cron-parser";

interface Schedule {
  /* 任务ID = Workflow.id */
  id: string;
  /* 是否启用 */
  enabled: boolean;
  /* 任务表达式 */
  schedules: string[];
  /* 定时器 */
  timers: NodeJS.Timeout[];
  /* 最后执行时间 */
  lastRunTime?: string;
  /* 下次执行时间 */
  nextRunTime?: string;
  /* 执行状态 */
  status?: "pending" | "running" | "completed" | "failed";
  /* 错误信息 */
  error?: string;
}

class SchedulerManager {
  private static store = new Echo<Record<Schedule["id"], Schedule>>(
    {},
    {
      name: "scheduler",
      storage: "indexedDB",
    },
  );

  static use = SchedulerManager.store.use.bind(SchedulerManager.store);

  static set = SchedulerManager.store.set.bind(SchedulerManager.store);

  static current = SchedulerManager.store.getCurrent();

  static calculateNextRun(cronExpression: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: new Date(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      return interval.next().toDate();
    } catch (error) {
      console.error("无效的 cron 表达式:", error);
      throw error;
    }
  }

  private static clearTimers(id: string) {
    const task = this.store.current[id];
    if (task?.timers) {
      task.timers.forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
      // 清空定时器数组
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          timers: [],
        },
      }));
    }
  }

  private static async scheduleNextRun(id: string, cronExpr: string) {
    try {
      // 检查任务是否还存在且启用
      const task = this.store.current[id];
      if (!task || !task.enabled) {
        this.clearTimers(id);
        return;
      }

      const nextRun = this.calculateNextRun(cronExpr);
      const now = new Date();
      const delay = nextRun.getTime() - now.getTime();

      // 更新下次执行时间
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          nextRunTime: nextRun.toISOString(),
          status: "pending",
        },
      }));

      // 如果延迟小于0，说明已经错过了执行时间，立即执行
      if (delay <= 0) {
        console.log(`任务[${id}]已错过执行时间，立即执行`);
        await this.executeWorkflow(id);
        // 执行完后，安排下一次执行
        this.scheduleNextRun(id, cronExpr);
        return;
      }

      console.log(`任务[${id}]将在 ${nextRun.toLocaleString()} 执行`);
      const timer = setTimeout(async () => {
        // 再次检查任务是否还存在且启用
        const currentTask = this.store.current[id];
        if (!currentTask || !currentTask.enabled) {
          console.log(`任务[${id}]已禁用或不存在，清除定时器`);
          this.clearTimers(id);
          return;
        }

        console.log(`开始执行任务[${id}]`);
        await this.executeWorkflow(id);
        // 执行完后，安排下一次执行
        this.scheduleNextRun(id, cronExpr);
      }, delay);

      // 更新定时器
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          timers: [...(state[id]?.timers || []), timer],
        },
      }));
    } catch (error) {
      console.error(`为表达式 ${cronExpr} 创建定时器失败:`, error);
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  }

  private static async executeWorkflow(id: string) {
    // 检查任务是否还存在且启用
    const task = this.store.current[id];
    if (!task || !task.enabled) {
      console.log(`任务[${id}]不存在或已禁用，清除定时器`);
      this.clearTimers(id);
      return;
    }

    try {
      // 更新执行状态
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          status: "running",
          lastRunTime: new Date().toISOString(),
        },
      }));

      console.log(`开始执行任务[${id}]`);
      const result = await WorkflowManager.executeWorkflow(id);
      console.log(
        `执行工作流[${id}]结果:时间：${new Date().toLocaleString()} ${JSON.stringify(
          result,
        )}`,
      );

      if (!result.success) {
        throw new Error(result.error || "执行失败");
      }

      // 执行成功，更新状态
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          status: "completed",
          error: undefined,
        },
      }));
      console.log(`任务[${id}]执行成功`);
    } catch (error) {
      console.error(`执行任务[${id}]失败:`, error);

      // 更新失败状态
      this.store.set((state) => ({
        ...state,
        [id]: {
          ...state[id],
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  }

  static async schedule(id: string, cronExpressions: string): Promise<boolean> {
    try {
      // 检查工作流是否存在
      const workflow = WorkflowManager.get(id);
      if (!workflow) {
        console.log(`工作流[${id}]不存在，无法设置定时任务`);
        return false;
      }

      // 如果任务已存在，先停止它
      await this.unschedule(id);

      const schedules = cronExpressions
        .split("\n")
        .map((expr) => expr.trim())
        .filter((expr) => expr !== "");

      if (schedules.length === 0) {
        console.log(`工作流[${id}]没有有效的定时表达式`);
        return false;
      }

      // 验证所有 cron 表达式
      const validSchedules = schedules.filter((expr) => {
        try {
          CronExpressionParser.parse(expr);
          return true;
        } catch (error) {
          console.log(`工作流[${id}]的定时表达式无效: ${expr}`);
          return false;
        }
      });

      if (validSchedules.length === 0) {
        console.log(`工作流[${id}]没有有效的定时表达式`);
        return false;
      }

      // 保存任务信息
      this.store.set((state) => ({
        ...state,
        [id]: {
          id,
          enabled: true,
          schedules: validSchedules,
          timers: [],
          status: "pending",
          lastRunTime: undefined,
          nextRunTime: undefined,
          error: undefined,
        },
      }));

      // 为每个 cron 表达式创建定时器
      validSchedules.forEach((cronExpr) => {
        console.log(`为工作流[${id}]设置定时任务: ${cronExpr}`);
        this.scheduleNextRun(id, cronExpr);
      });

      console.log(`工作流[${id}]的定时任务设置成功`);
      return true;
    } catch (error) {
      console.error(`设置工作流[${id}]的定时任务失败:`, error);
      return false;
    }
  }

  static async unschedule(id: string): Promise<void> {
    const task = this.store.current[id];
    if (task) {
      // 清除所有定时器
      this.clearTimers(id);
      // 从存储中移除任务
      this.store.delete(id);
      console.log(`已清理工作流[${id}]的定时任务`);
    }
  }

  static isScheduled(id: string): boolean {
    return id in this.store.current;
  }

  static getScheduledTasks(): string[] {
    return Object.keys(this.store.current);
  }

  // 初始化所有已保存的定时任务
  static async initScheduledTasks(): Promise<void> {
    try {
      // 等待 store 就绪
      await this.store.ready();

      // 获取所有任务
      const tasks = Object.entries(this.store.current);
      console.log("开始初始化定时任务...");

      // 并行初始化定时任务
      await Promise.all(
        tasks.map(async ([id, task]) => {
          try {
            // 检查工作流是否存在
            const workflow = await WorkflowManager.get(id);
            console.log(workflow);
            if (!workflow) {
              console.log(`工作流[${id}]不存在，清理定时任务`);
              await this.unschedule(id);
              return;
            }

            if (!task.enabled) {
              console.log(`工作流[${id}]的定时任务未启用，跳过初始化`);
              return;
            }

            if (!task.schedules || task.schedules.length === 0) {
              console.log(`工作流[${id}]没有定时表达式，清理定时任务`);
              await this.unschedule(id);
              return;
            }

            // 验证所有 cron 表达式
            const validSchedules = task.schedules.filter((expr) => {
              try {
                CronExpressionParser.parse(expr);
                return true;
              } catch (error) {
                console.log(`工作流[${id}]的定时表达式无效: ${expr}`);
                return false;
              }
            });

            if (validSchedules.length === 0) {
              console.log(`工作流[${id}]没有有效的定时表达式，清理定时任务`);
              await this.unschedule(id);
              return;
            }

            // 重新调度任务
            await this.schedule(id, validSchedules.join("\n"));
            console.log(`工作流[${id}]的定时任务初始化成功`);
          } catch (error) {
            console.error(`初始化工作流[${id}]的定时任务失败:`, error);
            await this.unschedule(id);
          }
        }),
      );
      console.log("定时任务初始化完成");
    } catch (error) {
      console.error("初始化定时任务失败:", error);
    }
  }
}

export { SchedulerManager };
