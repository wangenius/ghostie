import { Echo } from "echo-state";
import { WorkflowAction, NodeAction, NodeType } from "./types/nodes";
import { gen } from "@/utils/generator";

/* 当前工作流动作 */
export const CurrentActionState = new Echo<WorkflowAction>({
  id: gen.id(),
  workflowId: "",
  actions: {},
  result: { success: false, data: null },
});

export class ActionManager {
  /* 工作流动作历史存储 */
  private static actionsState = new Echo<Record<string, WorkflowAction>>(
    {},
    {
      name: "workflows-actions",
      storage: "indexedDB",
      sync: true,
    }
  );

  /**
   * 创建新的工作流动作
   */
  static createWorkflowAction(workflowId: string): WorkflowAction {
    const action: WorkflowAction = {
      id: gen.id(),
      workflowId,
      actions: {},
      result: { success: false, data: null },
    };
    CurrentActionState.set(action);
    return action;
  }

  /**
   * 创建新的节点动作
   */
  static createNodeAction(nodeId: string, nodeType: NodeType): NodeAction {
    const action: NodeAction = {
      id: nodeId,
      type: nodeType,
      inputs: {},
      outputs: {},
      startTime: new Date().toISOString(),
      status: "running",
      result: { success: false, data: null },
    };
    return action;
  }

  /**
   * 更新当前工作流动作
   */
  static updateCurrentAction(action: Partial<WorkflowAction>) {
    CurrentActionState.set({
      ...CurrentActionState.current,
      ...action,
    });
  }

  /**
   * 更新节点动作
   */
  static updateNodeAction(nodeId: string, nodeAction: Partial<NodeAction>) {
    const currentActions = { ...CurrentActionState.current.actions };
    currentActions[nodeId] = {
      ...(currentActions[nodeId] || {}),
      ...nodeAction,
    } as NodeAction;

    CurrentActionState.set({
      ...CurrentActionState.current,
      actions: currentActions,
    });
  }

  /**
   * 保存工作流动作到历史记录
   */
  static saveAction(action: WorkflowAction) {
    this.actionsState.set({
      ...this.actionsState.current,
      [action.id]: action,
    });
  }

  /**
   * 获取工作流动作历史记录
   */
  static getAction(actionId: string): WorkflowAction | undefined {
    return this.actionsState.current[actionId];
  }
}
