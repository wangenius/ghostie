import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import {
  NodeAction,
  NodeExecuteResult,
  NodeType,
  Workflow,
  WorkflowAction,
  WorkflowNode,
} from "./types/nodes";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
/* 当前工作流动作 */
export const CurrentActionState = new Echo<WorkflowAction>({
  id: gen.id(),
  workflowId: "",
  actions: {},
  result: { success: false, data: null },
});
/* 工作流管理器*/
export class WorkflowManager {
  /* 工作流状态 */
  static state = new Echo<Record<string, Workflow>>(
    {},
    {
      name: "workflows",
      storage: "indexedDB",
      sync: true,
    }
  );

  /* 工作流动作历史 */
  static actions = new Echo<Record<string, WorkflowAction>>(
    {},
    {
      name: "workflows-actions",
      storage: "indexedDB",
      sync: true,
    }
  );

  /* 工作流状态使用 */
  static use = WorkflowManager.state.use.bind(WorkflowManager.state);

  /**
   * 获取节点的输入数据
   */
  private static getNodeInputs(
    workflow: Workflow,
    node: WorkflowNode
  ): Record<string, any> {
    if (node.type === "start") {
      return CurrentActionState.current.actions[node.id]?.inputs || {};
    }

    // 获取所有指向当前节点的边
    const incomingEdges = workflow.edges.filter(
      (edge) => edge.target === node.id
    );

    // 收集输入数据
    const inputs: Record<string, any> = {};

    for (const edge of incomingEdges) {
      // 获取源节点的执行记录
      const sourceAction = CurrentActionState.current.actions[edge.source];
      /* 如果源节点执行成功，则获取源节点的输出数据 */
      if (sourceAction && sourceAction.outputs) {
        Object.assign(inputs, sourceAction.outputs);
      }
    }
    return inputs;
  }

  /**
   * 执行单个节点
   */
  static async executeNode(
    workflow: Workflow,
    node: WorkflowNode
  ): Promise<NodeExecuteResult> {
    try {
      // 更新当前执行节点
      CurrentActionState.set({
        ...CurrentActionState.current,
        currentNode: node,
      });

      // 获取或创建节点动作记录
      let action = CurrentActionState.current.actions[node.id] as NodeAction;
      if (!action) {
        action = {
          id: node.id,
          type: node.type as NodeType,
          inputs: {},
          outputs: {},
          startTime: new Date().toISOString(),
          status: "running",
          result: { success: false, data: null },
        };
        CurrentActionState.set({
          ...CurrentActionState.current,
          actions: {
            ...CurrentActionState.current.actions,
            [node.id]: action,
          },
        });
      }

      // 获取节点输入数据
      action.inputs = this.getNodeInputs(workflow, node);

      // 根据节点类型执行不同逻辑
      let result: NodeExecuteResult;
      switch (node.type) {
        case "start":
          const startInputs = action.inputs || {};

          result = {
            success: true,
            data: startInputs,
          };
          break;

        case "end":
          // 结束节点返回指定的结果
          const resultData = action.inputs;
          CurrentActionState.set({
            ...CurrentActionState.current,
            result: { success: true, data: resultData },
          });
          result = { success: true, data: resultData };
          break;

        case "chat":
          // TODO: 实现对话节点逻辑
          const chatConfig = node.data as {
            system: string;
            user: string;
            temperature: number;
            model: string;
          };

          // TODO: 调用 AI API
          result = {
            success: true,
            data: `模拟对话响应\n系统提示:${chatConfig.system}\n用户提示:${chatConfig.user}`,
          };
          break;

        case "bot":
          // TODO: 实现机器人节点逻辑
          const botConfig = node.data as {
            bot: string;
            input?: string;
          };

          const botInput = action.inputs;

          result = {
            success: true,
            data: `机器人 ${botConfig.bot} 响应: ${JSON.stringify(botInput)}`,
          };
          break;

        case "plugin":
          // TODO: 实现插件节点逻辑
          const pluginConfig = node.data as {
            plugin: string;
            tool: string;
            args?: Record<string, any>;
          };

          // 处理插件参数
          const pluginArgs = { ...pluginConfig.args };

          result = {
            success: true,
            data: `插件 ${pluginConfig.plugin}.${
              pluginConfig.tool
            } 执行结果: ${JSON.stringify(pluginArgs)}`,
          };
          break;

        case "branch":
          // 分支节点逻辑
          const branchConfig = node.data as {
            conditions: Array<{ expression: string; label: string }>;
          };

          // 创建表达式计算器
          const evaluator = new ExpressionEvaluator();

          // 查找第一个满足条件的分支
          const matchedCondition = branchConfig.conditions.find((condition) =>
            evaluator.evaluate(condition.expression, action.inputs)
          );

          result = {
            success: true,
            data: matchedCondition || branchConfig.conditions[0],
          };
          break;

        default:
          throw new Error(`不支持的节点类型: ${node.type}`);
      }

      // 更新动作状态和输出
      action.endTime = new Date().toISOString();
      action.status = result.success ? "completed" : "failed";
      action.result = result;
      action.outputs = result.data;

      // 更新上下文结果
      CurrentActionState.set({
        ...CurrentActionState.current,
        actions: {
          ...CurrentActionState.current.actions,
          [node.id]: action,
        },
      });

      return result;
    } catch (error) {
      // 更新动作状态为失败
      if (CurrentActionState.current.actions[node.id]) {
        const failedAction = CurrentActionState.current.actions[
          node.id
        ] as NodeAction;
        failedAction.status = "failed";
        failedAction.endTime = new Date().toISOString();
        failedAction.result = {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }

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
  static async exe(): Promise<NodeExecuteResult> {
    try {
      // 获取工作流定义
      const workflow = this.get(CurrentActionState.current.workflowId);
      if (!workflow) {
        throw new Error(
          `工作流不存在: ${CurrentActionState.current.workflowId}`
        );
      }

      // 查找开始节点
      const startNode = workflow.nodes.find((node) => node.type === "start");
      if (!startNode) {
        throw new Error("工作流缺少开始节点");
      }

      // 执行节点队列
      const executedNodes = new Set<string>();
      let currentNode: WorkflowNode | undefined = startNode;

      /* 执行节点队列 */
      while (currentNode) {
        // 执行当前节点
        const result = await this.executeNode(workflow, currentNode);
        /* 如果执行失败，则抛出错误 */
        if (!result.success) {
          throw new Error(`节点 ${currentNode.id} 执行失败: ${result.error}`);
        }
        /* 添加已执行节点 */
        executedNodes.add(currentNode.id);
        /* 获取当前节点的出边 */
        const outgoingEdges = workflow.edges.filter(
          (edge) => edge.source === currentNode!.id
        );

        /* 分支节点特殊处理 */
        if (currentNode.type === "branch") {
          // 分支节点特殊处理
          const branchResult = result.data;

          const matchedEdge = outgoingEdges.find(
            (edge) => edge.data?.sourceHandle === branchResult?.expression
          );
          const nextNode = matchedEdge
            ? workflow.nodes.find((node) => node.id === matchedEdge.target)
            : undefined;
          currentNode = nextNode;
        } else {
          // 普通节点，取第一个出边
          const nextEdge = outgoingEdges[0];
          const nextNode = nextEdge
            ? workflow.nodes.find((node) => node.id === nextEdge.target)
            : undefined;
          currentNode = nextNode;
        }

        // 检查是否存在循环
        if (currentNode && executedNodes.has(currentNode.id)) {
          throw new Error(`检测到循环执行: ${currentNode.id}`);
        }
      }
      /* 工作流持久化存储 */
      this.actions.set({
        [CurrentActionState.current.id]: CurrentActionState.current,
      });
      return {
        success: true,
        data: CurrentActionState.current.result,
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
  static save(workflow: Workflow) {
    const now = new Date().toISOString();
    const existingWorkflow = this.state.current[workflow.id];

    this.state.set({
      [workflow.id]: {
        ...existingWorkflow,
        ...workflow,
        updatedAt: now,
      },
    });
    return this.state.current[workflow.id];
  }

  /**
   * 获取工作流
   * @param id 工作流ID
   */
  static get(id: string): Workflow | undefined {
    return this.state.current[id];
  }
}
