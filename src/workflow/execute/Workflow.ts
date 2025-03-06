import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import { GraphExecutor } from "./GraphExecutor";
import { NodeExecutor } from "./NodeExecutor";
import { WorkflowEdge } from "../types/edges";
import {
  BotNodeConfig,
  BranchNodeConfig,
  ChatNodeConfig,
  NodeConfig,
  NodeResult,
  NodeState,
  NodeType,
  PluginNodeConfig,
  WorkflowNode,
  WorkflowProps,
} from "../types/nodes";
import { WorkflowManager } from "../WorkflowManager";

/* 初始化节点 */
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
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

/* 工作流类 */
export class Workflow {
  /* 该实例的状态 */
  private state = new Echo<{
    /* 工作流数据 */
    data: WorkflowProps;
    /* 节点状态 */
    nodeStates: Record<string, NodeState>;
    /* 已执行节点 */
    executedNodes: Set<string>;
    /* 是否正在执行 */
    isExecuting: boolean;
  }>(
    {
      data: INITIAL_WORKFLOW,
      nodeStates: {},
      executedNodes: new Set(),
      isExecuting: false,
    },
    {
      onChange: (state, oldState) => {
        if (state.data.id === oldState.data.id) {
          WorkflowManager.update(state.data);
        }
      },
    },
  );

  use = this.state.use.bind(this.state);
  set = this.state.set.bind(this.state);

  /* 全局工作流实例,用来在编辑器中使用 */
  static instance = new Workflow();

  /** 注册工作流，创建一个新的id，并保存到WorkflowManager中 */
  register() {
    const id = gen.id();
    this.state.set((state) => {
      return {
        ...state,
        data: { ...state.data, id },
      };
    });
    WorkflowManager.create(this.state.current.data);
    return id;
  }

  /** 更新节点数据 */
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

  /** 更新节点位置 */
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
              ...state.data.nodes[nodeId],
              position,
            },
          },
        },
      };
    });
  }

  /** 添加节点 */
  public addNode(type: NodeType, position: { x: number; y: number }) {
    const baseData = {
      type,
      name: type,
      inputs: {},
      outputs: {},
    };

    let nodeData: NodeConfig;
    switch (type) {
      case "start":
      case "end":
        nodeData = { ...baseData } as NodeConfig;
        break;
      case "chat":
        nodeData = {
          ...baseData,
          model: "",
          system: "",
        } as ChatNodeConfig;
        break;
      case "bot":
        nodeData = {
          ...baseData,
          bot: "",
        } as BotNodeConfig;
        break;
      case "plugin":
        nodeData = {
          ...baseData,
          plugin: "",
          tool: "",
          args: {},
        } as PluginNodeConfig;
        break;
      case "branch":
        nodeData = {
          ...baseData,
          conditions: [],
        } as BranchNodeConfig;
        break;
      default:
        nodeData = baseData as NodeConfig;
    }

    const newNode: WorkflowNode = {
      id: gen.id(),
      type,
      name: type,
      position,
      data: nodeData,
    };

    this.state.set((state) => {
      if (!state.data) return state;
      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [newNode.id]: newNode,
          },
        },
        nodeStates: {
          ...state.nodeStates,
          [newNode.id]: {
            status: "pending",
            inputs: {},
            outputs: {},
          },
        },
      };
    });
  }

  /** 添加边 */
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

  /** 删除节点 */
  public removeNode(nodeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;

      const { [nodeId]: _, ...remainingNodes } = state.data.nodes;
      const { [nodeId]: __, ...remainingNodeStates } = state.nodeStates;
      return {
        ...state,
        data: {
          ...state.data,
          nodes: remainingNodes,
        },
        nodeStates: remainingNodeStates,
      };
    });
  }

  /** 删除边 */
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

  /** 创建工作流实例 */
  static async create(workflowId?: string): Promise<Workflow> {
    const workflow = new Workflow();
    await workflow.init(workflowId);
    return workflow;
  }

  /** 初始化工作流 */
  constructor() {
    // 构造函数中不再调用异步的 init
  }

  /** 初始化工作流 */
  public async init(workflowId?: string): Promise<Workflow> {
    /* 初始化，将工作流数据设置到state中 */
    const workflow = workflowId
      ? (await WorkflowManager.get(workflowId)) ?? INITIAL_WORKFLOW
      : INITIAL_WORKFLOW;

    // 设置工作流数据和初始状态
    this.state.set(
      {
        data: workflow,
        nodeStates: {},
        executedNodes: new Set(),
        isExecuting: false,
      },
      { replace: true },
    );

    /* 初始化节点状态 */
    this.initNodeStates();
    return this;
  }

  /** 更新节点状态 */
  private updateNodeState(nodeId: string, update: Partial<NodeState>) {
    this.state.set((state) => ({
      ...state,
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...state.nodeStates[nodeId],
          ...update,
          outputs: {
            ...state.nodeStates[nodeId]?.outputs,
            ...(update.outputs || {}),
          },
        },
      },
    }));
  }

  /** 初始化节点状态 */
  private initNodeStates() {
    const graphExecutor = new GraphExecutor(
      {
        nodes: this.state.current.data.nodes,
        edges: this.state.current.data.edges,
      },
      new NodeExecutor((nodeId: string, update: Partial<NodeState>) =>
        this.updateNodeState(nodeId, update),
      ),
      (nodeId) => this.state.current.nodeStates[nodeId],
      (nodeId) => {
        this.state.set((state) => ({
          ...state,
          executedNodes: new Set([...state.executedNodes, nodeId]),
        }));
      },
    );

    const nodeStates = graphExecutor.initializeNodeStates();
    this.state.set((state) => ({
      ...state,
      nodeStates,
    }));
  }

  /* 执行工作流 */
  public async execute(): Promise<NodeResult> {
    try {
      this.state.set((state) => ({
        ...state,
        executedNodes: new Set(),
        isExecuting: true,
      }));

      const graphExecutor = new GraphExecutor(
        {
          nodes: this.state.current.data.nodes,
          edges: this.state.current.data.edges,
        },
        new NodeExecutor((nodeId: string, update: Partial<NodeState>) => {
          this.state.set((state) => ({
            ...state,
            nodeStates: {
              ...state.nodeStates,
              [nodeId]: {
                ...state.nodeStates[nodeId],
                ...update,
                outputs: {
                  ...state.nodeStates[nodeId]?.outputs,
                  ...(update.outputs || {}),
                },
              },
            },
          }));
        }),
        (nodeId) => this.state.current.nodeStates[nodeId],
        (nodeId) => {
          this.state.set((state) => ({
            ...state,
            executedNodes: new Set([...state.executedNodes, nodeId]),
          }));
        },
      );

      const result = await graphExecutor.execute();

      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      return result;
    } catch (error) {
      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
