import { Echo } from "echo-state";

export interface ParamHistoryItem {
  timestamp: string;
  values: Record<string, any>;
}

export interface ParamHistoryState {
  [workflowId: string]: ParamHistoryItem[];
}

export class ParamHistory {
  private static store = new Echo<ParamHistoryState>({}).localStorage({
    name: "workflow_params_history",
  });
  static use = ParamHistory.store.use.bind(ParamHistory.store);

  static async init(): Promise<void> {
    await this.store.ready();
  }

  static addHistory(workflowId: string, values: Record<string, any>) {
    const history = this.store.current[workflowId] || [];
    const newHistory = [
      {
        timestamp: new Date().toISOString(),
        values,
      },
      ...history.slice(0, 9),
    ];

    this.store.set({
      ...this.store.current,
      [workflowId]: newHistory,
    });
  }

  static clearHistory(workflowId: string) {
    const { [workflowId]: _, ...rest } = this.store.current;
    this.store.set(rest, { replace: true });
  }
}
