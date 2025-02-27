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
    nodeStates: Record<string, NodeState>;
    executedNodes: Set<string>;
    isExecuting: boolean;
  }>({
    data: INITIAL_WORKFLOW,
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
        nodeStates: {
          ...state.nodeStates,
          [node.id]: {
            status: "pending",
            inputs: {},
            outputs: {},
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
    const existingWorkflow = workflowId
      ? WorkflowManager.get(workflowId)
      : undefined;
    const workflow = existingWorkflow || {
      ...INITIAL_WORKFLOW,
      id: gen.id(),
    };

    if (workflowId && !existingWorkflow) {
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

  private collectNodeInputs(
    nodeId: string,
    predecessors: Map<string, Set<string>>,
  ): Record<string, any> {
    const inputs: Record<string, Record<string, any>> = {};

    if (nodeId === "start") {
      return this.current.data!.nodes[nodeId].data.inputs;
    }

    // 获取所有前置节点
    const prevNodes = predecessors.get(nodeId) || new Set();

    // 收集所有前置节点的输出
    prevNodes.forEach((prevId) => {
      // 每次都重新获取最新的节点状态
      const prevState = this.getNodeState(prevId);
      const prevNode = this.current.data!.nodes[prevId];

      if (prevState.status === "completed") {
        // 对于分支节点的特殊处理
        if (prevNode.type === "branch") {
          // 只收集满足条件的分支输出
          const branchOutput = prevState.outputs;
          if (
            branchOutput &&
            this.shouldFollowBranch(prevId, nodeId, branchOutput)
          ) {
            inputs[prevId] = branchOutput;
          }
        } else {
          // 其他节点以节点ID为key存储输出
          inputs[prevId] = prevState.outputs;
        }
      }
    });

    return inputs;
  }

  private shouldFollowBranch(
    branchId: string,
    targetId: string,
    branchOutput: any,
  ): boolean {
    // 每次都重新获取最新的节点数据
    const node = this.current.data!.nodes[branchId];
    if (!node || node.type !== "branch") return true;

    const selectedCondition = branchOutput;

    // 检查目标节点是否是选中的分支
    const edge = Object.values(this.current.data!.edges).find(
      (e) => e.source === branchId && e.target === targetId,
    ) as WorkflowEdge & { condition?: string };

    return edge?.condition === selectedCondition?.id;
  }

  private async executeNode(node: WorkflowNode): Promise<NodeResult> {
    try {
      console.log("执行节点", node);
      // 构建图结构以获取前置节点
      const { predecessors } = this.buildExecutionGraph();
      const inputs = this.collectNodeInputs(node.id, predecessors);
      console.log("节点输入", inputs);
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
            data: {
              result: res.body,
            },
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

  deleteNode(nodeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;
      const { [nodeId]: __, ...remainingNodes } = state.data.nodes;
      return {
        ...state,
        data: { ...state.data, nodes: remainingNodes },
      };
    });
  }
  /* 执行工作流 */
  public async execute(): Promise<NodeResult> {
    try {
      console.log("开始执行工作流", this.current.data);

      // 重置执行状态
      this.state.set((state) => ({
        ...state,
        executedNodes: new Set(),
        nodeStates: Object.fromEntries(
          Object.keys(state.data!.nodes).map((nodeId) => [
            nodeId,
            { inputs: {}, outputs: {}, status: "pending" },
          ]),
        ),
        isExecuting: true,
      }));

      // 构建图结构
      const graph = this.buildExecutionGraph();

      // 从start节点开始执行
      const startNode = this.current.data!.nodes["start"];
      if (!startNode) {
        throw new Error("工作流缺少开始节点");
      }

      // 执行工作流
      await this.executeGraph(graph);

      // 获取end节点的结果
      const endState = this.getNodeState("end");

      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      return {
        success: true,
        data: endState.outputs,
      };
    } catch (error) {
      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      console.error("工作流执行错误:", error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildExecutionGraph() {
    const nodes = this.current.data!.nodes;
    const edges = Object.values(this.current.data!.edges);

    // 构建邻接表
    const graph = new Map<string, Set<string>>();
    // 构建入度表
    const inDegree = new Map<string, number>();
    // 构建前置节点表
    const predecessors = new Map<string, Set<string>>();

    // 初始化图结构
    Object.keys(nodes).forEach((nodeId) => {
      graph.set(nodeId, new Set());
      inDegree.set(nodeId, 0);
      predecessors.set(nodeId, new Set());
    });

    // 建立连接关系
    edges.forEach((edge) => {
      graph.get(edge.source)?.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      predecessors.get(edge.target)?.add(edge.source);
    });

    return {
      graph,
      inDegree,
      predecessors,
    };
  }

  private async executeGraph(graph: {
    graph: Map<string, Set<string>>;
    inDegree: Map<string, number>;
    predecessors: Map<string, Set<string>>;
  }) {
    const { graph: adjacencyList, inDegree, predecessors } = graph;

    // 获取入度为0的节点作为起始节点
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    while (queue.length > 0) {
      const currentBatch = [...queue];
      queue.length = 0;

      // 并行执行当前批次的节点
      await Promise.all(
        currentBatch.map(async (nodeId) => {
          // 每次都重新获取最新的节点数据
          const node = this.current.data!.nodes[nodeId];
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

          // 收集前置节点的输出作为当前节点的输入
          this.collectNodeInputs(nodeId, predecessors);

          // 执行节点
          const result = await this.executeNode(node);

          if (!result.success) {
            throw new Error(`节点 ${nodeId} 执行失败: ${result.error}`);
          }

          // 更新节点状态
          this.updateNodeState(nodeId, {
            status: "completed",
            outputs: result.data,
            endTime: new Date().toISOString(),
          });

          // 更新已执行节点集合
          this.state.set((state) => ({
            ...state,
            executedNodes: state.executedNodes.add(nodeId),
          }));

          // 更新后继节点的入度
          adjacencyList.get(nodeId)?.forEach((nextId) => {
            const newDegree = inDegree.get(nextId)! - 1;
            inDegree.set(nextId, newDegree);

            // 如果后继节点的入度为0，加入队列
            if (newDegree === 0) {
              queue.push(nextId);
            }
          });
        }),
      );
    }
  }

  reset(id?: string) {
    console.log(id);
    const workflow =
      id === "new"
        ? {
            ...INITIAL_WORKFLOW,
            id: gen.id(),
          }
        : WorkflowManager.get(id || "");

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
    };
  }
}
