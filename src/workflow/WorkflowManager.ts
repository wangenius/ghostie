import { Echo } from "echo-state";

export interface Workflow {
  /* 工作流ID */
  id: string;
  /* 工作流名称 */
  name: string;
  /* 工作流描述 */
  description: string;
  /* 创建时间 */
  createdAt: string;
  /* 更新时间 */
  updatedAt: string;
}

export class WorkflowManager {
  static state = new Echo<Record<string, Workflow>>({});

  static use = WorkflowManager.state.use.bind(WorkflowManager.state);
}
