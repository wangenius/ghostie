import { Echo } from "echo-state";
import { WorkflowProps } from "./types/nodes";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Cron } from "croner";

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
  private static scheduledTasks: Record<string, Cron> = {};

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
   * 设置工作流定时执行
   * @param id 工作流ID
   * @param cron cron表达式
   */
  static async scheduleWorkflow(id: string, cron: string) {
    try {
      // 验证cron表达式
      try {
        new Cron(cron);
      } catch (error) {
        throw new Error("无效的 cron 表达式");
      }

      // 如果已存在定时任务，先取消
      await this.unscheduleWorkflow(id);

      // 创建新的定时任务
      const task = new Cron(cron, async () => {
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
            await cmd.open("workflow-execute", { id });
          } catch (error) {
            console.error(`定时执行工作流[${id}]失败:`, error);
          }
        }
      });

      // 存储定时任务引用
      this.scheduledTasks[id] = task;

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
      const task = this.scheduledTasks[id];
      if (task) {
        task.stop();
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
