import { Edge } from "reactflow";

export type EdgeType = "default" | "condition";

export interface WorkflowEdgeData {
  type: EdgeType;
  label?: string;
  condition?: string; // 改为字符串，存储条件表达式
  sourceHandle?: string;
  targetHandle?: string;
}

// 扩展 Edge 类型，确保包含所有必要的属性
export type WorkflowEdge = Edge<WorkflowEdgeData> & {
  source: string;
  target: string;
  type: EdgeType;
};

export interface EdgeTypeDefinition {
  type: EdgeType;
  label: string;
  component: React.ComponentType<any>;
  createCondition?: (config: any) => (context: any) => boolean;
}
