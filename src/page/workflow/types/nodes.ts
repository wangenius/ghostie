import { ModelItem } from "@/agent/types/agent";
import { AgentNode } from "@/page/workflow/nodes/AgentNode";
import { ChatNode } from "@/page/workflow/nodes/ChatNode";
import { CodeNode } from "@/page/workflow/nodes/CodeNode";
import { EndNode } from "@/page/workflow/nodes/EndNode";
import { IteratorNode } from "@/page/workflow/nodes/IteratorNode";
import { NotificationNode } from "@/page/workflow/nodes/MessageNode";
import { PanelNode } from "@/page/workflow/nodes/PanelNode";
import { PluginNode } from "@/page/workflow/nodes/PluginNode";
import { StartNode } from "@/page/workflow/nodes/StartNode";
import { SwitchNode } from "@/page/workflow/nodes/SwitchNode";
import { ToolParameters } from "@/toolkit/types";
import {
  TbArrowIteration,
  TbBellRinging2,
  TbCode,
  TbDatabase,
  TbFlag,
  TbGhost3,
  TbMessage,
  TbPhoto,
  TbPlaceholder,
  TbPlayerPlay,
  TbScript,
  TbSwitch,
  TbWallpaper,
} from "react-icons/tb";
import { MarkerType, Node } from "reactflow";
import { CustomEdge } from "../components/CustomEdge";
import { FormatNode } from "../nodes/FormatNode";
import { ImageNode } from "../nodes/ImageNode";
import { WorkflowEdge } from "./edges";
import { DatabaseNode } from "../nodes/DatabaseNode";
/* 节点类型 */
export const nodeTypes = {
  /* 开始节点，一个工作流必须有且只有一个开始节点 */
  start: StartNode,
  /* 结束节点，一个工作流必须有且只有一个结束节点 */
  end: EndNode,
  /* 对话节点，用于与用户进行对话 */
  chat: ChatNode,
  /* 助手节点，用于执行助手任务 */
  agent: AgentNode,
  /* 插件节点，用于执行插件任务 */
  plugin: PluginNode,
  /* 分支节点，用于根据条件执行不同的任务 */
  switch: SwitchNode,
  /* 面板节点，用于显示面板 */
  panel: PanelNode,
  /* 迭代器节点，用于迭代执行任务 */
  iterator: IteratorNode,
  /* 代码节点，用于执行代码 */
  code: CodeNode,
  /* 消息节点，用于显示消息 */
  notification: NotificationNode,
  /* 图片节点，用于显示图片 */
  image: ImageNode,
  /* 格式化节点，用于格式化文本 */
  format: FormatNode,
  /* 数据库节点，用于执行数据库操作 */
  database: DatabaseNode,
} as const;

/* 边类型 */
export const edgeTypes = {
  default: CustomEdge,
};
export const NODE_TYPES: Record<
  keyof typeof nodeTypes,
  { label: string; icon: React.ElementType; variant: string; preview?: boolean }
> = {
  start: {
    label: "start",
    icon: TbPlayerPlay,
    variant: "bg-slate-50 border-slate-200",
  },
  end: { label: "end", icon: TbFlag, variant: "bg-red-50 border-red-200" },
  chat: {
    label: "chat",
    icon: TbMessage,
    variant: "bg-blue-50 border-blue-200",
  },
  agent: {
    label: "agent",
    icon: TbGhost3,
    variant: "bg-violet-50 border-violet-200",
  },
  code: {
    label: "code",
    icon: TbCode,
    variant: "bg-purple-50 border-purple-200",
  },
  plugin: {
    label: "plugin",
    icon: TbScript,
    variant: "bg-amber-50 border-amber-200",
  },
  image: {
    label: "image",
    icon: TbPhoto,
    variant: "bg-purple-50 border-purple-200",
  },
  format: {
    label: "format",
    icon: TbPlaceholder,
    variant: "bg-purple-50 border-purple-200",
  },
  switch: {
    label: "switch",
    icon: TbSwitch,
    variant: "bg-orange-50 border-orange-200",
    preview: true,
  },
  iterator: {
    label: "iterator",
    icon: TbArrowIteration,
    variant: "bg-green-50 border-green-200",
    preview: true,
  },
  panel: {
    label: "panel",
    icon: TbWallpaper,
    variant: "bg-muted border-muted-foreground/20",
  },
  database: {
    label: "database",
    icon: TbDatabase,
    variant: "bg-purple-50 border-purple-200",
  },
  notification: {
    label: "notification",
    icon: TbBellRinging2,
    variant: "bg-purple-50 border-purple-200",
  },
} as const;

export const EDGE_CONFIG = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed },
};

/* 工作流节点 */
export type WorkflowNode<
  T extends NodeConfig = NodeConfig,
  U extends NodeType = NodeType,
> = Node<T, U> & {
  /* 节点名称 */
  name: string;
  /* 节点类型 */
  type: NodeType;
};
/* 节点状态 */
export interface NodeState {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  type: NodeType;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  startTime?: string;
  endTime?: string;
}

export interface WorkflowMeta {
  /* 工作流ID */
  id: string;
  /* 工作流名称 */
  name: string;
  /* 工作流描述 */
  description: string;
  /* 创建时间 */
  createdAt: number;
  /* 更新时间 */
  updatedAt: number;
}

/* 工作流 */
export interface WorkflowBody {
  id: string;
  /* 工作流节点 */
  nodes: Record<string, WorkflowNode>;
  /* 工作流边 */
  edges: Record<string, WorkflowEdge>;
  /* 工作流视图 */
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
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
export type NodeType = keyof typeof nodeTypes;

/* 基础节点配置 */
export interface BaseNodeConfig {
  /* 基础节点类型 */
  type: NodeType;
  /* 基础节点名称 */
  name: string;
  /* 基础节点参数 */
  args?: Record<string, any>;
}

export interface StartNodeConfig extends BaseNodeConfig {
  type: "start";
  parameters?: ToolParameters;
}

export interface EndNodeConfig extends BaseNodeConfig {
  type: "end";
  /* 结束节点内容 */
  content?: string;
}

export interface NotificationNodeConfig extends BaseNodeConfig {
  type: "notification";
  /* 消息类型 */
  variant: "success" | "error";
  /* 消息内容 */
  message: string;
}

export interface PanelNodeConfig extends BaseNodeConfig {
  type: "panel";
}

export interface FormatNodeConfig extends BaseNodeConfig {
  type: "format";
  /* 格式化文本 */
  content: string;
}

export interface ChatNodeConfig extends BaseNodeConfig {
  type: "chat";
  system: string;
  user: string;
  temperature: number;
  model: ModelItem;
}

export interface ImageNodeConfig extends BaseNodeConfig {
  type: "image";
  prompt: string;
  negative_prompt?: string;
  image?: string;
  model: ModelItem;
}

export interface AgentNodeConfig extends BaseNodeConfig {
  type: "agent";
  agent: string;
  prompt: string;
}

export interface IteratorNodeConfig extends BaseNodeConfig {
  type: "iterator";
  /* 迭代对象,是state中outputs下的JSON对象的属性路径 */
  target: string;
  /* 最大迭代次数 */
  max: number;
  /* 迭代对象类型 */
  action: string;
}

export interface CodeNodeConfig extends BaseNodeConfig {
  type: "code";
  /* 代码 */
  code: string;
}

export interface PluginNodeConfig extends BaseNodeConfig {
  type: "plugin";
  plugin: string;
  tool: string;
  args?: Record<string, any>;
}

export interface SwitchNodeConfig extends BaseNodeConfig {
  /* 开关节点类型 */
  type: "switch";
  /* 条件 */
  condition: string;
}

export interface DatabaseNodeConfig extends BaseNodeConfig {
  /* 数据库节点类型 */
  type: "database";
  /* 数据库表名 */
  table: string;
  /* 数据库查询条件 */
  condition: string;
}

export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | ChatNodeConfig
  | AgentNodeConfig
  | PluginNodeConfig
  | SwitchNodeConfig
  | CodeNodeConfig
  | IteratorNodeConfig
  | NotificationNodeConfig
  | ImageNodeConfig
  | FormatNodeConfig
  | DatabaseNodeConfig;

export const INITIAL_WORKFLOW: WorkflowMeta = {
  id: "",
  name: "",
  description: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
