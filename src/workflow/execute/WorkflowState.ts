import { Echo } from "echo-state";
import { NodeState } from "../types/nodes";

export class WorkflowState {
  /* 	each node state */
  private store = new Echo<Record<string, NodeState>>({});
  private executedNode = new Echo<Set<string>>(new Set());
  private isExecuting = new Echo<{ bool: boolean }>({ bool: false });

  constructor() {}

  get current() {
    return this.store.current;
  }

  use = this.store.use.bind(this.store);
  useExecutedNodes = this.executedNode.use.bind(this.executedNode);
  useIsExecuting = this.isExecuting.use.bind(this.isExecuting);

  setExecutedNodes(id: string) {
    this.executedNode.set((prev) => new Set([...prev, id]));
  }

  updateNodeState(id: string, update: Partial<NodeState>) {
    this.store.set((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...update },
    }));
  }
  initNodeStates(id: string) {
    this.store.set((prev) => {
      return {
        ...prev,
        [id]: {
          inputs: {},
          outputs: {},
          status: "pending",
        },
      };
    });
  }
  removeNodeState(id: string) {
    this.store.delete(id);
  }
}
