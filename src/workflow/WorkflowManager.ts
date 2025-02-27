import { Echo } from "echo-state";
import { WorkflowProps } from "./types/nodes";

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

  /**
   * 保存工作流
   * @param workflow 工作流数据
   */
  static save(workflow: WorkflowProps) {
    const now = new Date().toISOString();
    const existingWorkflow = this.store.current[workflow.id];
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
  static get(id: string): WorkflowProps | undefined {
    return this.store.current[id];
  }
}
