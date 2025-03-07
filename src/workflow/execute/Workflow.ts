import { gen } from "@/utils/generator";
import { Echo } from "echo-state";
import {
  BotNodeConfig,
  BranchNodeConfig,
  ChatNodeConfig,
  INITIAL_WORKFLOW,
  NodeConfig,
  NodeResult,
  NodeState,
  NodeType,
  PluginNodeConfig,
  WorkflowNode,
  WorkflowProps,
} from "../types/nodes";
import { WorkflowManager } from "../WorkflowManager";
import { GraphExecutor } from "./GraphExecutor";
import { NodeExecutor } from "./NodeExecutor";
import { WorkflowState } from "./WorkflowState";

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

  state = new WorkflowState();

  use = this.store.use.bind(this.store);
  set = this.store.set.bind(this.store);

  nodes() {
    return this.store.current.nodes;
  }

  edges() {
    return this.store.current.edges;
  }

  /* 全局工作流实例,用来在编辑器中使用 */
  static instance = new Workflow();

  /** 注册工作流，创建一个新的id，并保存到WorkflowManager中 */
  register() {
    const id = gen.id();
    this.store.set({ id });
    WorkflowManager.create(this.store.current);
    return id;
  }

  /** 更新节点数据 */
  public updateNode<T extends NodeConfig>(
    nodeId: string,
    data: Partial<WorkflowNode<T>>,
  ) {
    this.store.set((state) => {
      if (!state) return state;
      const node = state.nodes[nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...node,
            ...data,
          },
        },
      };
    });
  }

  public updateNodeData<T extends NodeConfig>(
    nodeId: string,
    selector: Partial<T> | ((data: T) => Partial<T>),
  ) {
    this.store.set((state) => {
      if (!state) return state;
      const node = state.nodes[nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [nodeId]: {
            ...node,
            data: {
              ...node.data,
              ...(typeof selector === "function"
                ? selector(node.data as T)
                : selector),
            },
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
    this.updateNode(nodeId, { position });
  }

  /** 添加节点 */
  public addNode(
    type: NodeType,
    position: { x: number; y: number },
  ): WorkflowNode {
    const baseData = {
      type,
      name: type,
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
          inputs: {},
          outputs: {},
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

    this.store.set((state) => {
      if (!state) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [newNode.id]: newNode,
        },
      };
    });
    this.state.initNodeStates(newNode.id);
    return newNode;
  }

  /** 添加边 */
  public addEdge(edge: any) {
    this.store.set((state) => {
      if (!state) return state;

      return {
        ...state,
        edges: {
          ...state.edges,
          [edge.id]: edge,
        },
      };
    });
  }

  /** 删除节点 */
  public removeNode(nodeId: string) {
    this.store.set((state) => {
      if (!state) return state;
      const { [nodeId]: _, ...remainingNodes } = state.nodes;
      return {
        ...state,
        nodes: remainingNodes,
      };
    });
    this.state.removeNodeState(nodeId);
  }

  /** 删除边 */
  public removeEdge(edgeId: string) {
    this.store.delete(edgeId);
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
    this.store.set(workflow, { replace: true });

    /* 初始化节点状态 */
    this.initNodeStates();
    return this;
  }

  /** 初始化节点状态 */
  private initNodeStates() {
    this.state = new WorkflowState();
    const graphExecutor = new GraphExecutor(
      {
        nodes: this.store.current.nodes,
        edges: this.store.current.edges,
      },
      new NodeExecutor((nodeId: string, update: Partial<NodeState>) =>
        this.state.updateNodeState(nodeId, update),
      ),
      (nodeId) => this.state.current[nodeId],
      (nodeId) => {
        this.state.setExecutedNodes(nodeId);
      },
    );

    const nodeStates = graphExecutor.initializeNodeStates();
    this.store.set((state) => ({
      ...state,
      nodeStates,
    }));
  }

  /* 执行工作流 */
  public async execute(): Promise<NodeResult> {
    try {
      this.store.set((state) => ({
        ...state,
        executedNodes: new Set(),
        isExecuting: true,
      }));

      const graphExecutor = new GraphExecutor(
        {
          nodes: this.store.current.nodes,
          edges: this.store.current.edges,
        },
        new NodeExecutor((nodeId: string, update: Partial<NodeState>) => {
          this.state.updateNodeState(nodeId, update);
        }),
        (nodeId) => this.state.current[nodeId],
        (nodeId) => {
          this.state.setExecutedNodes(nodeId);
        },
      );

      const result = await graphExecutor.execute();

      this.store.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      return result;
    } catch (error) {
      this.store.set((state) => ({
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
