import { WorkflowEdge } from "@/page/workflow/types/edges";
import { Echoa } from "echo-state";
import {
  NodeResult,
  NodeState,
  WorkflowNode,
} from "../../page/workflow/types/nodes";
import { Workflow } from "../Workflow";
import { NodeExecutor } from "./NodeExecutor";

export class WorkflowExecutor {
  /* 	each node state */
  store = new Echoa<Record<string, NodeState>>({});
  executedNode = new Echoa<Set<string>>(new Set());
  get current() {
    return this.store.current;
  }
  result: NodeResult = {
    success: false,
    data: null,
    error: undefined,
  };

  use = this.store.use.bind(this.store);
  private workflow: Workflow;
  private graph: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();
  private predecessors: Map<string, Set<string>> = new Map();
  private onDeleteEdge?: (edgeId: string) => void;

  constructor(workflow: Workflow, onDeleteEdge?: (edgeId: string) => void) {
    this.workflow = workflow;
    this.onDeleteEdge = onDeleteEdge;
  }

  /* 构建图 */
  private buildGraph(
    nodes: Record<string, WorkflowNode>,
    edges: Record<string, WorkflowEdge>,
  ) {
    this.graph.clear();
    this.inDegree.clear();
    this.predecessors.clear();

    Object.keys(nodes).forEach((nodeId) => {
      this.graph.set(nodeId, new Set());
      this.inDegree.set(nodeId, 0);
      this.predecessors.set(nodeId, new Set());
    });

    Object.entries(edges).forEach(([edgeId, edge]) => {
      if (!nodes[edge.source] || !nodes[edge.target]) {
        this.onDeleteEdge?.(edgeId);
        return;
      }

      this.graph.get(edge.source)?.add(edge.target);
      this.inDegree.set(edge.target, (this.inDegree.get(edge.target) || 0) + 1);
      this.predecessors.get(edge.target)?.add(edge.source);
    });
  }

  /* 更新节点状态 */
  private updateNodeState(id: string, update: Partial<NodeState>) {
    if (!id) return;
    this.store.set((prev) => {
      const existingState = prev[id] || { status: "pending", type: "unknown" };
      return {
        ...prev,
        [id]: {
          ...existingState,
          ...update,
          status: update.status || existingState.status || "pending",
        },
      };
    });
  }

  /* 获取节点输入 */
  private getNodeInputs(
    nodeId: string,
    nodes: Record<string, WorkflowNode>,
  ): Record<string, any> {
    if (nodes[nodeId]?.type === "start") {
      return nodes[nodeId]?.data || {};
    }

    const inputs: Record<string, any> = {};
    const prevNodes = this.predecessors.get(nodeId) || new Set();
    const currentStates = this.store.current;

    prevNodes.forEach((prevId) => {
      const prevState = currentStates[prevId];

      if (prevState?.status === "skipped") {
        return;
      }

      if (prevState?.status === "completed") {
        inputs[prevId] = prevState.outputs;
      }
    });

    return inputs;
  }

  /* 执行工作流 */
  public async execute(_?: Record<string, any>): Promise<NodeResult> {
    const body = await this.workflow.getBody();
    const { nodes, edges } = body;
    console.log("nodes", nodes);
    console.log("edges", edges);
    const startNode = Object.values(nodes).find(
      (node) => node.type === "start",
    );

    if (!startNode) {
      console.error("Workflow lacks a start node.");
      return {
        success: false,
        data: null,
        error: "Workflow must have a start node.",
      };
    }

    try {
      this.buildGraph(nodes, edges);
      const initialStates = this.initializeNodeStates(nodes);
      this.store.set(initialStates);
      this.executedNode.set(new Set());
      this.result = { success: false, data: null, error: undefined };
    } catch (setupError) {
      console.error("Error setting up workflow execution:", setupError);
      return {
        success: false,
        data: null,
        error: `Error initializing workflow: ${setupError instanceof Error ? setupError.message : String(setupError)}`,
      };
    }

    // 3. Start execution process (Topological Sort/BFS)
    const queue: string[] = [];
    const executed = new Set<string>();

    // Initialize queue with nodes having in-degree 0
    Object.keys(nodes).forEach((nodeId) => {
      if (this.inDegree.get(nodeId) === 0) {
        // Check initial state: if skipped, process immediately, else add to queue
        if (this.store.current[nodeId]?.status === "skipped") {
          executed.add(nodeId);
          this.executedNode.set(new Set(executed));
          // Since it's skipped, immediately process its successors for potential skipping or queueing
          this.processNextNodes(nodeId, nodes, queue, executed);
        } else {
          queue.push(nodeId);
        }
      }
    });

    // If start node wasn't added (e.g., has predecessors incorrectly), ensure it's added if its state is not skipped.
    // However, standard topological sort expects start nodes to have in-degree 0.
    // If the start node has in-degree > 0 based on graph build, there might be a cycle or incorrect edge.
    // Let's refine the initialization: only nodes with inDegree 0 and not skipped should initially be in the queue.
    queue.length = 0; // Reset queue after potential skipping propagation
    Object.keys(nodes).forEach((nodeId) => {
      if (
        this.inDegree.get(nodeId) === 0 &&
        this.store.current[nodeId]?.status !== "skipped"
      ) {
        queue.push(nodeId);
      }
    });

    try {
      while (queue.length > 0) {
        const currentBatch = [...queue];
        queue.length = 0;

        await Promise.all(
          currentBatch.map(async (nodeId) => {
            const node = nodes[nodeId];
            if (!node) {
              // This should not happen if graph build is correct, but good safeguard
              console.error(`Node data not found for ID: ${nodeId}`);
              throw new Error(`Node data not found: ${nodeId}`);
            }

            // Node might have been marked skipped by a predecessor during parallel execution batch, re-check state
            const currentState = this.store.current[nodeId];
            if (currentState?.status === "skipped") {
              if (!executed.has(nodeId)) {
                // Avoid reprocessing if already marked executed
                executed.add(nodeId);
                this.executedNode.set(new Set(executed));
                this.processNextNodes(nodeId, nodes, queue, executed); // Process successors
              }
              return; // Skip execution
            }

            try {
              // Get inputs based on the state *just before* execution
              const nodeInputs = this.getNodeInputs(nodeId, nodes); // Pass nodes data

              const executor = NodeExecutor.create(node, (update) => {
                this.updateNodeState(node.id, update);
              });

              /* 执行节点 */
              const result = await executor.execute(nodeInputs);

              if (node.type === "end") {
                this.result = result; // Store result from the end node
                console.log(
                  "Workflow execution reached end node. Result:",
                  this.result,
                );
              }

              if (result.success) {
                executed.add(nodeId);
                this.executedNode.set(new Set(executed));
                this.processNextNodes(nodeId, nodes, queue, executed); // Process successors
              } else {
                // Node execution failed
                console.error(
                  `Node ${nodeId} execution failed: ${result.error}`,
                );
                // Update state to failed
                this.updateNodeState(nodeId, {
                  status: "failed",
                  error:
                    result.error ||
                    "Node execution failed without specific error.",
                });
                // Decide on error handling: stop workflow vs continue? Currently stopping.
                throw new Error(`Node ${nodeId} failed: ${result.error}`);
              }
            } catch (error) {
              console.error(`Error during node execution: ${nodeId}`, error);
              // Ensure state is marked as failed even if execute fails unexpectedly
              if (this.store.current[nodeId]?.status !== "failed") {
                this.updateNodeState(nodeId, {
                  status: "failed",
                  error: error instanceof Error ? error.message : String(error),
                });
              }
              // Re-throw to stop the workflow execution in the main catch block
              throw error;
            }
          }),
        );
      }

      // After loop: Check if all nodes were executed or skipped
      const allNodesProcessed = Object.keys(nodes).every((id) =>
        executed.has(id),
      );
      if (!allNodesProcessed) {
        console.warn(
          "Workflow finished, but not all nodes were processed. Possible cycle or disconnected component.",
        );
      }

      console.log(
        "Workflow execution completed. Final states:",
        this.store.current,
      );
      return this.result;
    } catch (error) {
      console.error("Workflow execution failed:", error);
      // Return a failure result for the entire workflow
      return {
        success: false,
        data: null,
        error: `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /* 处理下一个节点 */
  private processNextNodes(
    nodeId: string,
    nodes: Record<string, WorkflowNode>, // Pass nodes for context
    queue: string[],
    executed: Set<string>,
  ) {
    this.graph.get(nodeId)?.forEach((nextId) => {
      // Check if next node exists before processing
      if (!nodes[nextId]) {
        console.warn(
          `Successor node ${nextId} not found for node ${nodeId}. Skipping.`,
        );
        return;
      }

      const predecessors = Array.from(this.predecessors.get(nextId) || []);
      const currentStates = this.store.current; // Get current states once

      // Check if all predecessors are completed or skipped
      const allDependenciesMet = predecessors.every((predId) => {
        const status = currentStates[predId]?.status;
        return status === "completed" || status === "skipped";
      });

      if (!allDependenciesMet) {
        // Dependencies not met, cannot proceed with this successor yet
        return;
      }

      // Check if all predecessors were skipped
      const allSkipped =
        predecessors.length > 0 &&
        predecessors.every(
          (predId) => currentStates[predId]?.status === "skipped",
        );

      // If all predecessors were skipped, this node should also be skipped
      if (allSkipped) {
        // Check if already processed or skipped to prevent infinite loops in cycles (though cycles should be avoided)
        if (
          !executed.has(nextId) &&
          currentStates[nextId]?.status !== "skipped"
        ) {
          this.updateNodeState(nextId, {
            status: "skipped",
            outputs: {}, // Skipped nodes have no outputs
          });
          executed.add(nextId); // Mark as processed (skipped)
          this.executedNode.set(new Set(executed));
          // Recursively process the *next* nodes now that this one is skipped
          this.processNextNodes(nextId, nodes, queue, executed);
        }
        return; // Don't add to queue if skipped
      }

      // If dependencies are met and the node wasn't skipped due to all predecessors being skipped
      // and it hasn't been executed or queued yet: add it to the queue.
      // The inDegree decrement logic is implicitly handled by checking all predecessors' status.
      // We no longer need to track inDegree dynamically during execution here.
      if (
        !executed.has(nextId) &&
        !queue.includes(nextId) &&
        currentStates[nextId]?.status !== "completed" &&
        currentStates[nextId]?.status !== "failed"
      ) {
        // Check state again before adding to queue to handle parallel updates
        if (currentStates[nextId]?.status === "pending") {
          // Only queue if pending
          queue.push(nextId);
        }
      }
    });
  }

  /* 初始化节点状态 */
  public initializeNodeStates(
    nodes: Record<string, WorkflowNode>,
  ): Record<string, NodeState> {
    const nodeStates: Record<string, NodeState> = {};

    Object.entries(nodes).forEach(([nodeId, node]) => {
      nodeStates[nodeId] = {
        inputs: {},
        outputs: {},
        status: "pending",
        type: node.type,
        error: undefined,
      };
    });

    let changed = true; // Flag to repeat if skips propagate
    while (changed) {
      changed = false;
      Object.keys(nodes).forEach((nodeId) => {
        // Skip check only if node is currently pending
        if (nodeStates[nodeId].status === "pending") {
          const node = nodes[nodeId];
          const predecessors = this.predecessors.get(nodeId) || new Set();

          const isStartNode = node.type === "start";
          const hasNoPredecessors = predecessors.size === 0;

          // Condition 1: Not a start node and has no predecessors in the graph
          if (!isStartNode && hasNoPredecessors) {
            nodeStates[nodeId].status = "skipped";
            changed = true; // Mark change to potentially re-evaluate dependent nodes
          }
          // Condition 2: All predecessors are already marked as skipped
          else if (predecessors.size > 0) {
            const allPredsSkipped = Array.from(predecessors).every(
              (predId) => nodeStates[predId]?.status === "skipped",
            );
            if (allPredsSkipped) {
              nodeStates[nodeId].status = "skipped";
              changed = true;
            }
          }
        }
      });
    } // Keep checking until no more nodes are marked skipped in a pass

    return nodeStates;
  }
}
