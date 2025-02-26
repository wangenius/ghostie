import { Echo } from "echo-state";
import { WorkflowEdge } from "./types/edges";
import { NodeExecuteResult, NodeAction, WorkflowNode } from "./types/nodes";
import { gen } from "@/utils/generator";

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
  /* 工作流节点 */
  nodes: WorkflowNode[];
  /* 工作流边 */
  edges: WorkflowEdge[];
}

/* 工作流执行上下文 */
export interface WorkflowExecuteContext {
  /* 上下文id */
  id: string;
  /* 工作流ID */
  workflowId: string;
  /* 工作流动作记录 */
  actions: Record<string, NodeAction>;
  /* 当前节点 */
  currentNode?: WorkflowNode;
  /* 执行结果 */
  result: any;
}

/* 工作流管理器*/
export class WorkflowManager {
  static state = new Echo<Record<string, Workflow>>(
    {},
    {
      name: "workflows",
      storage: "indexedDB",
      sync: true,
    }
  );

  /* 工作流动作历史 */
  static actions = new Echo<Record<string, WorkflowExecuteContext>>(
    {},
    {
      name: "workflows-actions",
      storage: "indexedDB",
      sync: true,
    }
  );

  static use = WorkflowManager.state.use.bind(WorkflowManager.state);

  /**
   * 执行单个节点
   */
  static async executeNode(
    node: WorkflowNode,
    context: WorkflowExecuteContext
  ) {
    try {
      const action = context.actions[node.id];
      if (!action) {
        throw new Error("节点动作不存在");
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行工作流
   */
  static async executeWorkflow(
    context: WorkflowExecuteContext
  ): Promise<NodeExecuteResult> {
    try {
      // 记录工作流动作
      this.actions.set({
        [context.id]: context,
      });

      // 模拟执行成功
      return {
        success: true,
        data: "工作流执行完成",
        error: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 保存工作流
   * @param workflow 工作流数据
   */
  static save(workflow: Partial<Workflow>) {
    const now = new Date().toISOString();
    const id = workflow.id || gen.id();

    const existingWorkflow = this.state.current[id];

    const updatedWorkflow: Workflow = {
      id,
      name: workflow.name || "未命名工作流",
      description: workflow.description || "",
      createdAt: existingWorkflow?.createdAt || now,
      updatedAt: now,
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      ...workflow,
    };

    this.state.set({
      [id]: updatedWorkflow,
    });

    return updatedWorkflow;
  }

  /**
   * 获取工作流
   * @param id 工作流ID
   */
  static get(id: string): Workflow | undefined {
    return this.state.current[id];
  }
}
