import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import { INITIAL_WORKFLOW, NodeResult, WorkflowProps } from "../types/nodes";
import { WorkflowManager } from "../WorkflowManager";
import { WorkflowExecutor } from "./WorkflowExecutor";

/* 工作流类 */
export class Workflow {
  /* 该实例的状态存储 */
  private store = new Echo<WorkflowProps>(INITIAL_WORKFLOW, {
    onChange: (state, oldState) => {
      if (state.id === oldState.id) {
        WorkflowManager.update(state);
      }
    },
  });

  executor: WorkflowExecutor;

  use = this.store.use.bind(this.store);
  set = this.store.set.bind(this.store);

  nodes() {
    return this.store.current.nodes;
  }

  edges() {
    return this.store.current.edges;
  }

  id() {
    return this.store.current.id;
  }

  current = this.store.current;

  /* 全局工作流实例,用来在编辑器中使用 */
  static instance = new Workflow();

  /** 注册工作流，创建一个新的id，并保存到WorkflowManager中 */
  register() {
    const id = gen.id();
    this.store.set({ id });
    WorkflowManager.create(this.store.current);
    return id;
  }

  /** 创建工作流实例 */
  static async create(workflowId?: string): Promise<Workflow> {
    const workflow = new Workflow();
    await workflow.init(workflowId);
    return workflow;
  }

  /** 初始化工作流 */
  constructor() {
    this.executor = new WorkflowExecutor(INITIAL_WORKFLOW, (edgeId) => {
      this.store.set((state) => ({
        ...state,
        edges: Object.fromEntries(
          Object.entries(state.edges).filter(([id]) => id !== edgeId),
        ),
      }));
    });
  }

  /** 初始化工作流 */
  public async init(workflowId?: string): Promise<Workflow> {
    /* 初始化，将工作流数据设置到state中 */
    const workflow = workflowId
      ? (await WorkflowManager.get(workflowId)) ?? INITIAL_WORKFLOW
      : INITIAL_WORKFLOW;

    // 设置工作流数据和初始状态
    this.store.set(workflow, { replace: true });

    // 重新创建执行器实例，使用最新的工作流数据
    this.executor = new WorkflowExecutor(this.store.current, (edgeId) => {
      this.store.set((state) => ({
        ...state,
        edges: Object.fromEntries(
          Object.entries(state.edges).filter(([id]) => id !== edgeId),
        ),
      }));
    });
    return this;
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
