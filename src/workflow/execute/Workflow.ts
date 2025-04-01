import { Echo } from "echo-state";
import {
  INITIAL_WORKFLOW,
  NodeResult,
  WorkflowMeta,
  WorkflowProps,
} from "../types/nodes";
import { WorkflowExecutor } from "./WorkflowExecutor";
import { gen } from "@/utils/generator";
import { SchedulerManager } from "../scheduler/SchedulerManager";

/* 工作流类 */
export class Workflow {
  /* 工作流列表 */
  static list = new Echo<Record<string, WorkflowMeta>>({}).localStorage({
    name: "workflows",
  });

  static WORKFLOW_DATABASE = "workflows";

  /* 工作流的数据 */
  private store = new Echo<WorkflowProps>(INITIAL_WORKFLOW);
  /* 工作流执行器 */
  executor: WorkflowExecutor;

  /* 工作流数据使用 */
  use = this.store.use.bind(this.store);
  /* 工作流数据设置 */
  set = this.store.set.bind(this.store);
  /* 工作流数据当前 */
  async current() {
    const store = await this.store.getCurrent();
    return store;
  }
  /* 工作流ID */
  async id() {
    const store = await this.store.getCurrent();
    return store.meta.id;
  }

  async meta() {
    const store = await this.store.getCurrent();
    return store.meta;
  }

  async body() {
    const store = await this.store.getCurrent();
    return store.body;
  }

  async switch(id: string): Promise<Workflow> {
    this.store.indexed({
      database: Workflow.WORKFLOW_DATABASE,
      name: id,
    });
    return this;
  }

  async close() {
    this.store.temporary().reset();
    this.executor.reset(INITIAL_WORKFLOW);
  }

  /** 创建工作流实例 */
  static async create(): Promise<Workflow> {
    const id = gen.id();
    if (Workflow.list.current[id]) {
      throw new Error("工作流ID已存在");
    }
    const now = new Date().toISOString();
    const workflow = new Workflow({
      meta: {
        ...INITIAL_WORKFLOW.meta,
        id,
        createdAt: now,
        updatedAt: now,
      },
      body: { ...INITIAL_WORKFLOW.body },
    });
    Workflow.list.set({
      ...Workflow.list.current,
      [id]: {
        ...INITIAL_WORKFLOW.meta,
        id,
        createdAt: now,
        updatedAt: now,
      },
    });
    return workflow;
  }

  /* 获取工作流 */
  static async get(id: string): Promise<Workflow> {
    const workflow = new Workflow();
    workflow.switch(id);
    return workflow;
  }

  static new(): Workflow {
    const workflow = new Workflow();
    return workflow;
  }

  /** 初始化工作流 */
  private constructor(workflow?: WorkflowProps) {
    if (workflow) {
      this.store = new Echo<WorkflowProps>(workflow).indexed({
        database: Workflow.WORKFLOW_DATABASE,
        name: workflow.meta.id,
      });
    }
    this.executor = new WorkflowExecutor(
      workflow || INITIAL_WORKFLOW,
      (edgeId) => {
        this.store.set((state) => ({
          ...state,
          body: {
            ...state.body,
            edges: Object.fromEntries(
              Object.entries(state.body.edges).filter(([id]) => id !== edgeId),
            ),
          },
        }));
      },
    );
  }

  /** 初始化工作流 */
  public async init(): Promise<Workflow> {
    // 重新创建执行器实例，使用最新的工作流数据
    this.executor = new WorkflowExecutor(this.store.current, (edgeId) => {
      this.store.set((state) => ({
        ...state,
        body: {
          ...state.body,
          edges: Object.fromEntries(
            Object.entries(state.body.edges).filter(([id]) => id !== edgeId),
          ),
        },
      }));
    });
    return this;
  }

  /* 更新工作流 */
  async updateMeta(workflow: Partial<Omit<WorkflowMeta, "id">>) {
    const now = new Date().toISOString();
    const id = await this.id();
    const existingWorkflow = Workflow.list.current[id];
    if (!existingWorkflow) {
      throw new Error("工作流ID不存在");
    }
    const updatedWorkflow = {
      ...existingWorkflow,
      ...workflow,
      updatedAt: now,
    };

    this.store.set({
      ...this.store.current,
      meta: updatedWorkflow,
    });

    Workflow.list.set({
      ...Workflow.list.current,
      [id]: updatedWorkflow,
    });
    return updatedWorkflow;
  }

  async updateBody(body: Partial<WorkflowProps["body"]>) {
    const id = await this.id();
    const existingWorkflow = Workflow.list.current[id];
    if (!existingWorkflow) {
      throw new Error("工作流ID不存在");
    }
    this.store.set((prev) => {
      return {
        ...prev,
        body: {
          ...prev.body,
          ...body,
        },
      };
    });
  }

  static async delete(id: string) {
    const workflow = this.list.current[id];
    if (workflow) {
      // 如果工作流有定时任务，需要先取消
      await SchedulerManager.unschedule(id);
      Workflow.list.delete(id);
      new Echo<WorkflowProps | null>(null)
        .indexed({
          database: Workflow.WORKFLOW_DATABASE,
          name: id,
        })
        .discard();
    }
  }

  /* 执行工作流 */
  public async execute(inputs?: Record<string, any>): Promise<NodeResult> {
    try {
      /* 开始执行工作流 */
      this.executor.isExecuting.set({ bool: true });
      this.executor.reset(this.store.current);
      const result = await this.executor.execute(inputs);

      this.executor.isExecuting.set({ bool: false });
      return result;
    } catch (error) {
      this.executor.isExecuting.set({ bool: false });

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
export const ContextWorkflow = Workflow.new();
