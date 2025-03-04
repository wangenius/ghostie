import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import { SchedulerManager } from "./scheduler/SchedulerManager";
import { WorkflowProps } from "./types/nodes";
import { Workflow } from "./Workflow";

/** 工作流管理器*/
export class WorkflowManager {
  /* 工作流持久化存储 */
  private static store = new Echo<Record<WorkflowProps["id"], WorkflowProps>>(
    {},
    {
      name: "workflows",
      storage: "indexedDB",
    },
  );

  /* 工作流状态使用 */
  static use = WorkflowManager.store.use.bind(WorkflowManager.store);

  static current = WorkflowManager.store.getCurrent();

  /* 初始化工作流管理器 */
  static async init(): Promise<void> {
    await this.store.ready();
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
      return false;
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
      await SchedulerManager.unschedule(id);
      this.store.delete(id);
    }
  }

  /**
   * 执行工作流
   * @param id 工作流ID
   */
  static async executeWorkflow(id: string) {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          error: "工作流ID不能为空",
        };
      }

      // 检查工作流是否存在
      const existingWorkflow = this.store.current[id];
      if (!existingWorkflow) {
        return {
          success: false,
          data: null,
          error: `工作流[${id}]不存在`,
        };
      }

      const workflow = await Workflow.create(id);
      const result = await workflow.execute();
      return result;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
