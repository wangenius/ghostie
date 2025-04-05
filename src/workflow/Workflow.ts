import { gen } from "@/utils/generator";
import { Echo, Echoa } from "echo-state";
import {
  INITIAL_WORKFLOW,
  NodeResult,
  WorkflowMeta,
  WorkflowBody,
} from "../page/workflow/types/nodes";
import { Scheduler } from "./Scheduler";
import { WorkflowExecutor } from "./execute/WorkflowExecutor";
import { WORKFLOW_BODY_DATABASE } from "./const";
export const WORKFLOW_DATABASE = "workflows";

/* 工作流列表 */
export const WorkflowStore = new Echo<Record<string, WorkflowMeta>>({}).indexed(
  {
    database: WORKFLOW_DATABASE,
    name: "workflows",
  },
);

/* 工作流类 */
export class Workflow {
  /* 工作流元数据 */
  meta: WorkflowMeta;
  /* 工作流执行器 */
  executor: WorkflowExecutor;

  /* 关闭工作流 */
  async close() {
    this.executor = new WorkflowExecutor(this);
  }

  /* 获取工作流 */
  static get(id: string) {
    return new Workflow(WorkflowStore.current[id]);
  }

  /* 创建工作流 */
  static async create(): Promise<Workflow> {
    const id = gen.id();
    if (WorkflowStore.current[id]) {
      throw new Error("工作流ID已存在");
    }
    const now = Date.now();
    const workflow = new Workflow({
      ...INITIAL_WORKFLOW,
      id,
      createdAt: now,
      updatedAt: now,
    });
    WorkflowStore.set({
      [id]: workflow.meta,
    });
    return workflow;
  }

  /* 创建工作流实例 */
  constructor(meta: Partial<WorkflowMeta> = {}) {
    this.meta = { ...INITIAL_WORKFLOW, ...meta };
    this.executor = new WorkflowExecutor(this);
  }

  /* 更新工作流 */
  async updateMeta(workflow: Partial<Omit<WorkflowMeta, "id">>) {
    const now = Date.now();
    this.meta = {
      ...this.meta,
      ...workflow,
      updatedAt: now,
    };
    WorkflowStore.set({
      [this.meta.id]: this.meta,
    });
    return this;
  }

  async getBody() {
    return Echo.get<WorkflowBody>({
      database: WORKFLOW_BODY_DATABASE,
      name: this.meta.id,
    }).getCurrent();
  }

  static async delete(id: string) {
    const workflow = WorkflowStore.current[id];
    if (workflow) {
      // 如果工作流有定时任务，需要先取消
      Scheduler.cancel(id);
      WorkflowStore.delete(id);
      await Echo.get({
        database: WORKFLOW_DATABASE,
        name: id,
      }).discard();
    }
  }

  /* 执行工作流 */
  public async execute(inputs?: Record<string, any>): Promise<NodeResult> {
    try {
      const result = await this.executor.execute(inputs);
      console.log("result", result);
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
/* 当前工作流 */
export const CurrentWorkflow = new Echoa<Workflow>(new Workflow());
