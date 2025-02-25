import { Node } from "reactflow";

/* 节点类型 */
export type NodeType =
  | "start"
  | "end"
  | "chat"
  | "bot"
  | "plugin"
  | "condition"
  | "branch";

export interface ChatNodeConfig {
  /* 系统提示词 */
  system: string;
  /* 用户输入 */
  user: string;
  /* 温度 */
  temperature: number;
  /* 模型id */
  model: string;
}

/* 机器人节点配置 */
export interface BotNodeConfig {
  /* 机器人id */
  bot: string;
  /* 用户输入 */
  input?: string;
}

/* 插件节点配置 */
export interface PluginNodeConfig {
  /* 插件id */
  plugin: string;
  /* 工具名称 */
  tool: string;
  /* 工具参数 */
  args?: Record<string, any>;
}

/* 条件节点配置 */
export interface ConditionNodeConfig {
  /* 条件表达式 */
  expression: string;
}

/* 分支节点配置 */
export interface BranchNodeConfig {
  /* 条件表达式 */
  conditions: Array<{
    expression: string;
    label: string;
  }>;
}

export type NodeConfig =
  | ChatNodeConfig
  | BotNodeConfig
  | PluginNodeConfig
  | ConditionNodeConfig
  | BranchNodeConfig;

/* 工作流节点 */
export type WorkflowNode<T = any, U extends NodeType = NodeType> = Node<
  T,
  U
> & {
  /* 节点标签 */
  name: string;
};

export interface NodeTypeDefinition {
  type: NodeType;
  label: string;
  component: React.ComponentType<any>;
  defaultConfig?: Record<string, any>;
  validate?: (config: any) => boolean;
  createExecutor?: (config: any) => (input: any) => Promise<any>;
}
