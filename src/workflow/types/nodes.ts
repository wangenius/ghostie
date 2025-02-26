import { Node } from "reactflow";

/* 节点执行结果 */
export interface NodeExecuteResult {
  success: boolean;
  data: any;
  error?: string;
}

/* 工作流动作 */
export interface NodeAction {
  /* 节点ID */
  id: string;
  /* 节点类型 */
  type: NodeType;
  /* 输入数据 */
  inputs: Record<string, any>;
  /* 输出数据 */
  outputs: Record<string, any>;
}

/* 节点类型 */
export type NodeType =
  | "start"
  | "end"
  | "chat"
  | "bot"
  | "plugin"
  | "condition"
  | "branch";

/* 基础节点配置 */
export interface BaseNodeConfig {
  /* 基础节点类型 */
  type: NodeType;
  /* 基础节点名称 */
  name: string;
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
  input?: string;
}

export interface PluginNodeConfig extends BaseNodeConfig {
  type: "plugin";
  plugin: string;
  tool: string;
  args?: Record<string, any>;
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  type: "condition";
  expression: string;
}

export interface BranchNodeConfig extends BaseNodeConfig {
  type: "branch";
  conditions: Array<{
    expression: string;
    label: string;
  }>;
}

export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | ChatNodeConfig
  | BotNodeConfig
  | PluginNodeConfig
  | ConditionNodeConfig
  | BranchNodeConfig;

/* 工作流节点 */
export type WorkflowNode<T extends NodeConfig = NodeConfig> = Node<T> & {
  /* 节点名称 */
  name: string;
};
