import { Echo } from "echo-state";
import { NodeResult, NodeState, WorkflowProps } from "../types/nodes";
import { NodeExecutor } from "./NodeExecutor";

export class WorkflowExecutor {
  /* 	each node state */
  store = new Echo<Record<string, NodeState>>({});
  executedNode = new Echo<Set<string>>(new Set());
  isExecuting = new Echo<{ bool: boolean }>({ bool: false });

  private workflowData: WorkflowProps;
  private graph: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();
  private predecessors: Map<string, Set<string>> = new Map();
  private onDeleteEdge?: (edgeId: string) => void;
  private result: NodeResult = {
    success: false,
    data: null,
    error: undefined,
  };

  constructor(
    workflowData: WorkflowProps,
    onDeleteEdge?: (edgeId: string) => void,
  ) {
    this.workflowData = workflowData;
    this.onDeleteEdge = onDeleteEdge;
    this.buildGraph();
    this.result = {
      success: false,
      data: null,
      error: undefined,
    };
    const nodeStates = this.initializeNodeStates();
    this.store.set(nodeStates);
  }

  private buildGraph() {
    const { nodes, edges } = this.workflowData;

    // 初始化图结构
    Object.keys(nodes).forEach((nodeId) => {
      this.graph.set(nodeId, new Set());
      this.inDegree.set(nodeId, 0);
      this.predecessors.set(nodeId, new Set());
    });

    // 建立连接关系
    Object.entries(edges).forEach(([edgeId, edge]) => {
      // 检查边的两端节点是否都存在
      if (!nodes[edge.source] || !nodes[edge.target]) {
        // 如果有一端节点不存在，调用删除边的回调
        this.onDeleteEdge?.(edgeId);
        return;
      }

      this.graph.get(edge.source)?.add(edge.target);
      this.inDegree.set(edge.target, (this.inDegree.get(edge.target) || 0) + 1);
      this.predecessors.get(edge.target)?.add(edge.source);
    });
  }

  reset(state: WorkflowProps) {
    this.workflowData = state;
    this.graph.clear();
    this.inDegree.clear();
    this.predecessors.clear();
    this.buildGraph();
    const nodeStates = this.initializeNodeStates();
    this.store.set(nodeStates);
    this.result = {
      success: false,
      data: null,
      error: undefined,
    };
  }

  get current() {
    return this.store.current;
  }

  use = this.store.use.bind(this.store);
  useIsExecuting = this.isExecuting.use.bind(this.isExecuting);

  private updateNodeState(id: string, update: Partial<NodeState>) {
    if (!id) return;
    this.store.set((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...update,
        status: update.status || prev[id]?.status || "pending",
      },
    }));
  }

  private getNodeInputs(nodeId: string): Record<string, any> {
    if (this.workflowData.nodes[nodeId]?.type === "start") {
      return this.workflowData.nodes[nodeId]?.data || {};
    }

    const inputs: Record<string, any> = {};
    const prevNodes = this.predecessors.get(nodeId) || new Set();

    prevNodes.forEach((prevId) => {
      const prevState = this.store.current[prevId];

      if (prevState?.status === "skipped") {
        return;
      }

      if (prevState?.status === "completed") {
        inputs[prevId] = prevState.outputs;
      }
    });

    return inputs;
  }

  public async execute(inputs?: Record<string, any>): Promise<NodeResult> {
    try {
      const startNode = Object.values(this.workflowData.nodes).find(
        (node) => node.type === "start",
      );
      if (!startNode) {
        throw new Error("工作流中缺少开始节点");
      }

      this.isExecuting.set({ bool: true });

      const queue: string[] = [startNode.id];
      const executed = new Set<string>();

      while (queue.length > 0) {
        const currentBatch = [...queue];
        queue.length = 0;

        // 并行执行当前批次的节点
        await Promise.all(
          currentBatch.map(async (nodeId) => {
            const node = this.workflowData.nodes[nodeId];
            if (!node) {
              throw new Error(`节点不存在: ${nodeId}`);
            }

            const nodeState = this.store.current[nodeId];

            if (nodeState?.status === "skipped") {
              executed.add(nodeId);
              this.executedNode.set(new Set(executed));

              this.processNextNodes(nodeId, queue, executed);
              return;
            }

            console.log("正在执行节点", node);

            try {
              const nodeInputs =
                node.type === "start"
                  ? inputs || {}
                  : this.getNodeInputs(nodeId);

              const executor = NodeExecutor.create(node, (update) => {
                this.updateNodeState(node.id, update);
              });

              const result = await executor.execute(nodeInputs);

              if (node.type === "end") {
                this.result = result;
                console.log("工作流执行结果", this.result);
              }

              if (result.success) {
                executed.add(nodeId);
                this.executedNode.set(new Set(executed));
                this.processNextNodes(nodeId, queue, executed);
              } else {
                throw new Error(`节点 ${nodeId} 执行失败: ${result.error}`);
              }
            } catch (error) {
              console.error(`节点执行出错: ${nodeId}`, error);
              this.updateNodeState(nodeId, {
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
              });
              throw error;
            }
          }),
        );
      }

      this.isExecuting.set({ bool: false });

      return this.result;
    } catch (error) {
      console.error("工作流执行出错:", error);
      this.isExecuting.set({ bool: false });
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private processNextNodes(
    nodeId: string,
    queue: string[],
    executed: Set<string>,
  ) {
    this.graph.get(nodeId)?.forEach((nextId) => {
      const newDegree = this.inDegree.get(nextId)! - 1;
      this.inDegree.set(nextId, newDegree);

      const allPredecessorsCompleted = Array.from(
        this.predecessors.get(nextId) || [],
      ).every((predId) => {
        const status = this.store.current[predId]?.status;
        return status === "completed" || status === "skipped";
      });

      if (
        newDegree === 0 &&
        allPredecessorsCompleted &&
        !executed.has(nextId)
      ) {
        queue.push(nextId);
      }
    });
  }

  public initializeNodeStates(): Record<string, NodeState> {
    const nodeStates: Record<string, NodeState> = {};

    Object.entries(this.workflowData.nodes).forEach(([nodeId, node]) => {
      nodeStates[nodeId] = {
        inputs: {},
        outputs: {},
        status: "pending",
        error: undefined,
        type: node.type,
      };
    });

    // 检查是否应该被标记为skipped
    Object.entries(this.workflowData.nodes).forEach(([nodeId, node]) => {
      const prevNodes = this.predecessors.get(nodeId) || new Set();

      if (
        node.type !== "start" && // 确保start节点不会被标记为skipped
        (prevNodes.size === 0 ||
          Array.from(prevNodes).every(
            (prevId) => nodeStates[prevId]?.status === "skipped",
          ))
      ) {
        nodeStates[nodeId].status = "skipped";
      }
    });

    return nodeStates;
  }
}
