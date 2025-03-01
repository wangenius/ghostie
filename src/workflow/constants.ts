import {
  TbArrowsSplit,
  TbFlag,
  TbMessage,
  TbPlug,
  TbRobot,
  TbFilter,
  TbLayoutBoard,
} from "react-icons/tb";
import { MarkerType } from "reactflow";

export const NODE_TYPES = {
  start: { label: "开始", icon: TbFlag },
  end: { label: "结束", icon: TbFlag },
  chat: { label: "对话", icon: TbMessage },
  bot: { label: "机器人", icon: TbRobot },
  plugin: { label: "插件", icon: TbPlug },
  branch: { label: "分支", icon: TbArrowsSplit },
  filter: { label: "过滤", icon: TbFilter },
  panel: { label: "面板", icon: TbLayoutBoard },
} as const;

export const EDGE_CONFIG = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed },
};
