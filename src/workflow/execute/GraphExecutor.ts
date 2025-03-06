import { NodeResult, NodeState, WorkflowNode } from "../types/nodes";
import { WorkflowEdge } from "../types/edges";
import { NodeExecutor } from "./NodeExecutor";

export interface GraphData {
  nodes: Record<string, WorkflowNode>;
  edges: Record<string, WorkflowEdge>;
}

export class GraphExecutor {
  private graph: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();
  private predecessors: Map<string, Set<string>> = new Map();

  constructor(
    private graphData: GraphData,
    private nodeExecutor: NodeExecutor,
    private getNodeState: (nodeId: string) => NodeState,
    private onNodeExecuted: (nodeId: string) => void,
  ) {
    this.buildGraph();
  }

  private buildGraph() {
    const { nodes, edges } = this.graphData;

    // 初始化图结构
    Object.keys(nodes).forEach((nodeId) => {
      this.graph.set(nodeId, new Set());
      this.inDegree.set(nodeId, 0);
      this.predecessors.set(nodeId, new Set());
    });

    // 建立连接关系
    Object.values(edges).forEach((edge) => {
      this.graph.get(edge.source)?.add(edge.target);
      this.inDegree.set(edge.target, (this.inDegree.get(edge.target) || 0) + 1);
      this.predecessors.get(edge.target)?.add(edge.source);
    });
  }

  private collectNodeInputs(nodeId: string): Record<string, any> {
    const inputs: Record<string, Record<string, any>> = {};

    if (nodeId === "start") {
      return this.graphData.nodes[nodeId].data.inputs;
    }

    // 获取所有前置节点
    const prevNodes = this.predecessors.get(nodeId) || new Set();

    // 收集所有前置节点的输出
    prevNodes.forEach((prevId) => {
      const prevState = this.getNodeState(prevId);
      const prevNode = this.graphData.nodes[prevId];

      // 跳过skipped状态的节点
      if (prevState.status === "skipped") {
        return;
      }

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
    const node = this.graphData.nodes[branchId];
    if (!node || node.type !== "branch") return true;

    const selectedCondition = branchOutput;

    // 检查目标节点是否是选中的分支
    const edge = Object.values(this.graphData.edges).find(
      (e) => e.source === branchId && e.target === targetId,
    ) as WorkflowEdge & { condition?: string };

    return edge?.condition === selectedCondition?.id;
  }

  public async execute(): Promise<NodeResult> {
    try {
      // 只从start节点开始执行
      const queue: string[] = ["start"];

      while (queue.length > 0) {
        const currentBatch = [...queue];
        queue.length = 0;

        // 并行执行当前批次的节点
        await Promise.all(
          currentBatch.map(async (nodeId) => {
            const node = this.graphData.nodes[nodeId];
            if (!node) {
              throw new Error(`节点不存在: ${nodeId}`);
            }

            // 如果节点状态是skipped，直接处理后继节点
            const nodeState = this.getNodeState(nodeId);
            if (nodeState.status === "skipped") {
              this.onNodeExecuted(nodeId);

              // 直接处理后继节点
              this.graph.get(nodeId)?.forEach((nextId) => {
                const newDegree = this.inDegree.get(nextId)! - 1;
                this.inDegree.set(nextId, newDegree);

                if (newDegree === 0) {
                  queue.push(nextId);
                }
              });
              return;
            }

            // 收集前置节点的输出作为当前节点的输入
            const inputs = this.collectNodeInputs(nodeId);

            // 执行节点
            const res = await this.nodeExecutor.executeNode(node, inputs);

            if (!res.success) {
              throw new Error(`节点 ${nodeId} 执行失败: ${res.error}`);
            }

            // 更新已执行节点
            this.onNodeExecuted(nodeId);

            // 更新后继节点的入度，并检查是否可以执行
            this.graph.get(nodeId)?.forEach((nextId) => {
              const newDegree = this.inDegree.get(nextId)! - 1;
              this.inDegree.set(nextId, newDegree);

              // 对于 end 节点的特殊处理：只要有一个前置节点完成就更新显示
              if (nextId === "end") {
                const endNode = this.graphData.nodes[nextId];
                if (endNode) {
                  this.nodeExecutor.executeNode(
                    endNode,
                    this.collectNodeInputs(nextId),
                  );
                }
                return;
              }

              // 检查所有前置节点是否都已执行完成或被跳过
              const allPredecessorsCompleted = Array.from(
                this.predecessors.get(nextId) || [],
              ).every((predId) => {
                const status = this.getNodeState(predId)?.status;
                return status === "completed" || status === "skipped";
              });

              // 只有当入度为0且所有前置节点都执行完成或被跳过时，才加入队列
              if (newDegree === 0 && allPredecessorsCompleted) {
                queue.push(nextId);
              }
            });
          }),
        );
      }

      // 获取end节点的结果
      const endState = this.getNodeState("end");
      return {
        success: true,
        data: endState.outputs,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public initializeNodeStates(): Record<string, NodeState> {
    const nodeStates: Record<string, NodeState> = {};

    // 首先标记所有节点为pending
    Object.keys(this.graphData.nodes).forEach((nodeId) => {
      nodeStates[nodeId] = {
        inputs: {},
        outputs: {},
        status: "pending",
      };
    });

    // 特殊处理start节点
    nodeStates["start"].status = "pending";

    // 遍历所有节点，检查是否应该被标记为skipped
    Object.keys(this.graphData.nodes).forEach((nodeId) => {
      if (nodeId === "start") return;

      const prevNodes = this.predecessors.get(nodeId) || new Set();

      // 如果节点没有前置节点（除了start节点），或者所有前置节点都是skipped，则标记为skipped
      if (
        prevNodes.size === 0 ||
        Array.from(prevNodes).every(
          (prevId) =>
            nodeId !== "end" && // end节点即使没有入边也不应该被skip
            nodeStates[prevId]?.status === "skipped",
        )
      ) {
        nodeStates[nodeId].status = "skipped";
      }
    });

    return nodeStates;
  }
}
