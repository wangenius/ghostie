import { Echo } from "echo-state";
import { WorkflowProps } from "./types/nodes";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";

/* 工作流管理器 */
export class WorkflowManager {
  /* 工作流内容 */
  static store = new Echo<Record<string, WorkflowProps>>(
    {},
    {
      name: "workflows",
      storage: "indexedDB",
      sync: true,
    },
  );

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
      .then((result) => {
        if (result) {
          this.store.delete(id);
        }
      });
  }
}
