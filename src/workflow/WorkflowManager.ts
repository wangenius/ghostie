import { Echo } from "echo-state";
import { WorkflowProps } from "./types/nodes";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Cron } from "croner";
import { Workflow } from "./Workflow";

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

  /* 存储所有定时任务 */
  private static scheduledTasks: Record<string, Cron[]> = {};

  /* 工作流状态使用 */
  static use = WorkflowManager.store.use.bind(WorkflowManager.store);

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
    await WorkflowManager.store.ready();
    const existingWorkflow = this.store.current[workflow.id];
    if (!existingWorkflow) {
      console.log("工作流不存在");
      return false;
    }

    // 如果定时配置发生变化，需要更新定时任务
    if (workflow.schedule?.enabled && workflow.schedule.cron) {
      await this.scheduleWorkflow(workflow.id, workflow.schedule.cron);
    } else {
      await this.unscheduleWorkflow(workflow.id);
    }

    this.store.set({
      ...this.store.current,
      [workflow.id]: {
        ...existingWorkflow,
        ...workflow,
        updatedAt: now,
      },
    });
    return this.store.current[workflow.id];
  }

  /**
   * 获取工作流
   * @param id 工作流ID
   */
  static async get(id: string): Promise<WorkflowProps | undefined> {
    await WorkflowManager.store.ready();
    return this.store.current[id];
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   */
  static delete(id: string) {
    cmd
      .confirm(`确定删除工作流[${this.store.current[id]?.name}(${id})]吗？`)
      .then(async (result) => {
        if (result) {
          // 删除工作流前先取消定时任务
          await this.unscheduleWorkflow(id);
          this.store.delete(id);
        }
      });
  }

  /**
   * 执行工作流
   * @param id 工作流ID
   */
  static async executeWorkflow(id: string) {
    try {
      console.timeStamp(`开始执行工作流[${id}]`);
      const workflow = await Workflow.create(id);
      const result = await workflow.execute();

      console.timeStamp(`执行工作流[${id}]结果:${JSON.stringify(result)}`);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error(`执行工作流[${id}]失败:`, error);
      throw error;
    }
  }

  /**
   * 设置工作流定时执行
   * @param id 工作流ID
   * @param cron cron表达式或多个cron表达式（用换行符分隔）
   */
  static async scheduleWorkflow(id: string, cron: string) {
    try {
      // 取消现有的定时任务
      await this.unscheduleWorkflow(id);

      // 分割多个cron表达式
      const cronExpressions = cron.split("\n").filter((expr) => expr.trim());

      // 为每个cron表达式创建定时任务
      const tasks: Cron[] = [];
      for (const expr of cronExpressions) {
        try {
          // 验证cron表达式
          const task = new Cron(expr, async () => {
            const workflow = await this.get(id);
            if (workflow?.schedule?.enabled) {
              const now = new Date().toISOString();

              // 更新上次执行时间
              await this.update({
                ...workflow,
                schedule: {
                  ...workflow.schedule,
                  lastRunAt: now,
                },
              });

              // 执行工作流
              try {
                await this.executeWorkflow(id);
              } catch (error) {
                console.error(`定时执行工作流[${id}]失败:`, error);
              }
            }
          });
          tasks.push(task);
        } catch (error) {
          console.error(`无效的 cron 表达式: ${expr}`, error);
          // 如果有任何一个表达式无效，停止所有任务并返回失败
          tasks.forEach((t) => t.stop());
          return false;
        }
      }

      // 存储定时任务引用
      this.scheduledTasks[id] = tasks;

      return true;
    } catch (error) {
      console.error(`设置工作流[${id}]定时执行失败:`, error);
      return false;
    }
  }

  /**
   * 取消工作流定时执行
   * @param id 工作流ID
   */
  static async unscheduleWorkflow(id: string) {
    try {
      const tasks = this.scheduledTasks[id];
      if (tasks) {
        tasks.forEach((task) => task.stop());
        delete this.scheduledTasks[id];
      }
      return true;
    } catch (error) {
      console.error(`取消工作流[${id}]定时执行失败:`, error);
      return false;
    }
  }

  /**
   * 初始化所有已启用的定时任务
   */
  static async initScheduledTasks() {
    try {
      await this.store.ready();
      const workflows = Object.values(this.store.current);

      for (const workflow of workflows) {
        if (workflow.schedule?.enabled && workflow.schedule.cron) {
          await this.scheduleWorkflow(workflow.id, workflow.schedule.cron);
        }
      }
    } catch (error) {
      console.error("初始化定时任务失败:", error);
    }
  }
}

// 初始化所有定时任务
WorkflowManager.initScheduledTasks();
