import { Bot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { ChatModel } from "@/model/ChatModel";
import { ModelManager } from "@/model/ModelManager";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
import {
  BotNodeConfig,
  BranchNodeConfig,
  ChatNodeConfig,
  NodeResult,
  WorkflowNode,
  WorkflowProps,
} from "./types/nodes";
import { WorkflowManager } from "./WorkflowManager";
import { Echo } from "echo-state";
import { WorkflowEdge } from "./types/edges";
import { gen } from "@/utils/generator";

interface NodeState {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  startTime?: string;
  endTime?: string;
}
const initialNodes: Record<string, WorkflowNode> = {
  start: {
    id: "start",
    type: "start",
    name: "开始",
    data: {
      type: "start",
      name: "开始",
      inputs: {},
      outputs: {},
    },
    position: { x: 0, y: 0 },
  },
  end: {
    id: "end",
    type: "end",
    name: "结束",
    data: {
      type: "end",
      name: "结束",
      inputs: {},
      outputs: {},
    },
    position: { x: 850, y: 0 },
  },
};
const initialEdges: Record<string, WorkflowEdge> = {};

const INITIAL_WORKFLOW: WorkflowProps = {
  id: "",
  name: "",
  description: "",
  createdAt: "",
  updatedAt: "",
  nodes: initialNodes,
  edges: initialEdges,
};

/* 工作流 */
export class Workflow {
  private state = new Echo<{
    data: WorkflowProps;
    currentNode: WorkflowNode | undefined;
    nodeStates: Record<string, NodeState>;
    executedNodes: Set<string>;
    isExecuting: boolean;
  }>({
    data: INITIAL_WORKFLOW,
    currentNode: undefined,
    nodeStates: {},
    executedNodes: new Set(),
    isExecuting: false,
  });

  use = this.state.use.bind(this.state);

  set = this.state.set.bind(this.state);

  get current() {
    return this.state.current;
  }

  save() {
    WorkflowManager.save(this.state.current.data);
  }
  // 获取所有节点
  public getNodes(): WorkflowNode[] {
    return Object.values(this.state.current.data?.nodes || {});
  }

  // 获取所有边
  public getEdges() {
    return Object.values(this.state.current.data?.edges || {});
  }

  // 更新节点数据
  public updateNode(nodeId: string, data: any) {
    this.state.set((state) => {
      if (!state.data) return state;

      const node = state.data.nodes[nodeId];
      if (!node) return state;

      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          ...data,
        },
      };

      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [nodeId]: updatedNode,
          },
        },
      };
    });
  }

  // 更新节点位置
  public updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
  ) {
    this.state.set((state) => {
      if (!state.data) return state;

      const node = state.data.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [nodeId]: {
              ...node,
              position,
            },
          },
        },
      };
    });
  }

  // 添加节点
  public addNode(node: WorkflowNode) {
    this.state.set((state) => {
      if (!state.data) return state;

      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [node.id]: node,
          },
        },
      };
    });
  }

  // 添加边
  public addEdge(edge: any) {
    this.state.set((state) => {
      if (!state.data) return state;

      return {
        ...state,
        data: {
          ...state.data,
          edges: {
            ...state.data.edges,
            [edge.id]: edge,
          },
        },
      };
    });
  }

  // 删除节点
  public removeNode(nodeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;

      const { [nodeId]: _, ...remainingNodes } = state.data.nodes;
      return {
        ...state,
        data: {
          ...state.data,
          nodes: remainingNodes,
        },
      };
    });
  }

  // 删除边
  public removeEdge(edgeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;

      const { [edgeId]: _, ...remainingEdges } = state.data.edges;
      return {
        ...state,
        data: {
          ...state.data,
          edges: remainingEdges,
        },
      };
    });
  }

  constructor(workflowId?: string) {
    const workflow = WorkflowManager.get(workflowId || "") || {
      ...INITIAL_WORKFLOW,
      id: gen.id(),
    };
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }
    this.state.set((state) => ({
      ...state,
      data: workflow,
    }));
    this.initNodeStates();
  }

  private initNodeStates() {
    Object.values(this.state.current.data!.nodes).forEach((node) => {
      this.state.set((state) => ({
        ...state,
        nodeStates: {
          ...state.nodeStates,
          [node.id]: {
            inputs: {},
            outputs: {},
            status: "pending",
          },
        },
      }));
    });
  }

  private getNodeState(nodeId: string): NodeState {
    const state = this.state.current.nodeStates[nodeId];
    if (!state) {
      throw new Error(`节点状态不存在: ${nodeId}`);
    }
    return state;
  }

  private updateNodeState(nodeId: string, update: Partial<NodeState>) {
    const currentState = this.getNodeState(nodeId);
    this.state.set((state) => ({
      ...state,
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: { ...currentState, ...update },
      },
    }));
  }

  private getNodeInputs(node: WorkflowNode): Record<string, any> {
    if (node.type === "start") {
      return node.data.inputs || {};
    }

    const inputs: Record<string, any> = {};
    const incomingEdges = Object.values(this.state.current.data!.edges).filter(
      (edge) => edge.target === node.id,
    );

    for (const edge of incomingEdges) {
      const sourceState = this.getNodeState(edge.source);
      if (sourceState.status === "completed") {
        Object.assign(inputs, sourceState.outputs);
      }
    }

    return inputs;
  }

  private async executeNode(node: WorkflowNode): Promise<NodeResult> {
    try {
      const inputs = this.getNodeInputs(node);
      this.updateNodeState(node.id, {
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      let result: NodeResult;

      switch (node.type) {
        case "start":
          result = {
            success: true,
            data: inputs,
          };
          break;

        case "end":
          result = {
            success: true,
            data: inputs,
          };
          break;

        case "chat":
          const chatConfig = node.data as ChatNodeConfig;
          const res = await new ChatModel(ModelManager.get(chatConfig.model))
            .system(chatConfig.system)
            .stream(JSON.stringify(inputs));
          result = {
            success: true,
            data: { result: res.body },
          };
          break;

        case "bot":
          const botConfig = node.data as BotNodeConfig;
          const bot = new Bot(BotManager.get(botConfig.bot));
          const botResult = await bot.chat(JSON.stringify(inputs));
          result = {
            success: true,
            data: botResult,
          };
          break;

        case "branch":
          const branchConfig = node.data as BranchNodeConfig;
          const evaluator = new ExpressionEvaluator();
          const matchedCondition = branchConfig.conditions.find((condition) =>
            evaluator.evaluate(condition.expression, inputs),
          );
          result = {
            success: true,
            data: matchedCondition || branchConfig.conditions[0],
          };
          break;

        default:
          throw new Error(`不支持的节点类型: ${node.type}`);
      }

      this.updateNodeState(node.id, {
        status: "completed",
        outputs: result.data,
        endTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.updateNodeState(node.id, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        endTime: new Date().toISOString(),
      });

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /* 执行工作流 */
  public async execute(): Promise<NodeResult> {
    try {
      /* 获取开始节点 */
      const startNode = this.state.current.data!.nodes["start"];

      if (!startNode) {
        throw new Error("工作流缺少开始节点");
      }

      this.state.set((state) => ({
        ...state,
        currentNode: startNode,
      }));

      while (this.state.current.currentNode) {
        const result = await this.executeNode(this.state.current.currentNode);
        if (!result.success) {
          throw new Error(
            `节点 ${this.state.current.currentNode.id} 执行失败: ${result.error}`,
          );
        }

        this.state.set((state) => ({
          ...state,
          executedNodes: new Set(state.executedNodes).add(
            this.state.current.currentNode!.id,
          ),
        }));

        const outgoingEdges = Object.values(
          this.state.current.data!.edges,
        ).filter((edge) => edge.source === this.state.current.currentNode!.id);

        if (this.state.current.currentNode!.type === "branch") {
          const branchResult = result.data;
          const matchedEdge = outgoingEdges.find(
            (edge) => edge.data?.sourceHandle === branchResult?.expression,
          );
          this.state.set((state) => ({
            ...state,
            currentNode: matchedEdge
              ? this.state.current.data!.nodes[matchedEdge.target]
              : undefined,
          }));
        } else {
          const nextEdge = outgoingEdges[0];
          this.state.set((state) => ({
            ...state,
            currentNode: nextEdge
              ? this.state.current.data!.nodes[nextEdge.target]
              : undefined,
          }));
        }

        if (
          this.state.current.currentNode &&
          this.state.current.executedNodes.has(
            this.state.current.currentNode.id,
          )
        ) {
          throw new Error(
            `检测到循环执行: ${this.state.current.currentNode.id}`,
          );
        }
      }

      return {
        success: true,
        data: this.getNodeState("end").outputs,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  reset(id?: string) {
    console.log(id);
    const workflow = WorkflowManager.get(id || "") || {
      ...INITIAL_WORKFLOW,
      id: gen.id(),
    };
    if (!workflow) {
      throw new Error(`工作流不存在: ${id}`);
    }
    this.state.set((state) => ({
      ...state,
      data: workflow,
    }));
    this.initNodeStates();
  }

  public getExecutionState() {
    return {
      nodeStates: this.state.current.nodeStates,
      executedNodes: Array.from(this.state.current.executedNodes),
      currentNode: this.state.current.currentNode,
    };
  }
}
