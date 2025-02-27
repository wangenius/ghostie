import { Node } from "reactflow";
import { WorkflowEdge } from "./edges";

/* 工作流节点 */
export type WorkflowNode<
  T extends NodeConfig = NodeConfig,
  U extends NodeType = NodeType,
> = Node<T, U> & {
  /* 节点名称 */
  name: string;
};

/* 工作流 */
export interface WorkflowProps {
  /* 工作流ID */
  id: string;
  /* 工作流名称 */
  name: string;
  /* 工作流描述 */
  description: string;
  /* 创建时间 */
  createdAt: string;
  /* 更新时间 */
  updatedAt: string;
  /* 工作流节点 */
  nodes: Record<string, WorkflowNode>;
  /* 工作流边 */
  edges: Record<string, WorkflowEdge>;
}
/* 节点动作，用于记录节点执行历史 */
export interface NodeAction {
  /* 节点ID */
  id: string;
  /* 节点类型 */
  type: NodeType;
  /* 每个节点都可能有若干输入数据 */
  inputs: Record<string, any>;
  /* 每个节点都可能有若干输出数据 */
  outputs: Record<string, any>;
  /* 开始时间 */
  startTime: string;
  /* 结束时间 */
  endTime?: string;
  /* 状态 */
  status: "pending" | "running" | "completed" | "failed";
}

/* 工作流动作历史 */
export interface WorkflowActionProps {
  /* 动作ID */
  id: string;
  /* 工作流ID */
  workflowId: string;
  /* 工作流动作记录,key为节点ID,value为节点动作 */
  actions: Record<string, NodeAction>;
  /* 当前节点 */
  currentNode?: WorkflowNode;
  /* 执行结果 */
  result: NodeResult;
}
/* 节点执行结果 */
export interface NodeResult {
  /* 是否成功 */
  success: boolean;
  /* 执行结果数据 */
  data: any;
  /* 执行错误信息 */
  error?: string;
}
/* 节点类型 */
export type NodeType =
  | "start"
  | "end"
  | "chat"
  | "bot"
  | "plugin"
  | "branch"
  | "filter";

/* 基础节点配置 */
export interface BaseNodeConfig {
  /* 基础节点类型 */
  type: NodeType;
  /* 基础节点名称 */
  name: string;
  /* 基础节点输入 */
  inputs: Record<string, any>;
  /* 基础节点输出 */
  outputs: Record<string, any>;
  /* 基础节点参数 */
  args?: Record<string, any>;
}

export interface StartNodeConfig extends BaseNodeConfig {
  type: "start";
}

export interface EndNodeConfig extends BaseNodeConfig {
  type: "end";
  result?: string;
}

export interface ChatNodeConfig extends BaseNodeConfig {
  type: "chat";
  system: string;
  user: string;
  temperature: number;
  model: string;
}

export interface BotNodeConfig extends BaseNodeConfig {
  type: "bot";
  bot: string;
  prompt: string;
}

export interface PluginNodeConfig extends BaseNodeConfig {
  type: "plugin";
  plugin: string;
  tool: string;
  args?: Record<string, any>;
}

export interface BranchNodeConfig extends BaseNodeConfig {
  type: "branch";
  conditions: Array<{
    expression: string;
    label: string;
  }>;
}

export interface FilterNodeConfig extends BaseNodeConfig {
  type: "filter";
  filter: {
    fields: string[]; // 要选择的字段
    conditions?: {
      // 可选的过滤条件
      field: string;
      operator: "equals" | "contains" | "greater" | "less";
      value: string;
    }[];
  };
}

export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | ChatNodeConfig
  | BotNodeConfig
  | PluginNodeConfig
  | BranchNodeConfig
  | FilterNodeConfig;
