import {
  TbArrowIteration,
  TbArrowsSplit,
  TbCode,
  TbFlag,
  TbGhost3,
  TbMessage,
  TbPlug,
  TbWallpaper,
} from "react-icons/tb";
import { MarkerType } from "reactflow";
import { CustomEdge } from "./components/CustomEdge";
import { BotNode } from "./nodes/BotNode";
import { BranchNode } from "./nodes/BranchNode";
import { ChatNode } from "./nodes/ChatNode";
import { CodeNode } from "./nodes/CodeNode";
import { EndNode } from "./nodes/EndNode";
import { IteratorNode } from "./nodes/IteratorNode";
import { PanelNode } from "./nodes/PanelNode";
import { PluginNode } from "./nodes/PluginNode";
import { StartNode } from "./nodes/StartNode";
/* 节点类型 */
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  chat: ChatNode,
  bot: BotNode,
  plugin: PluginNode,
  branch: BranchNode,
  panel: PanelNode,
  iterator: IteratorNode,
  code: CodeNode,
} as const;

/* 边类型 */
export const edgeTypes = {
  default: CustomEdge,
};
export const NODE_TYPES = {
  start: { label: "开始", icon: TbFlag },
  end: { label: "结束", icon: TbFlag },
  chat: { label: "对话", icon: TbMessage },
  bot: { label: "助手", icon: TbGhost3 },
  code: { label: "代码", icon: TbCode },
  plugin: { label: "插件", icon: TbPlug },
  branch: { label: "分支", icon: TbArrowsSplit },
  iterator: { label: "迭代器", icon: TbArrowIteration },
  panel: { label: "面板", icon: TbWallpaper },
} as const;

export const EDGE_CONFIG = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed },
};
