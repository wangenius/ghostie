import {
  TbArrowsSplit,
  TbFlag,
  TbMessage,
  TbPlug,
  TbRobot,
  TbFilter,
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
} as const;

export const EDGE_CONFIG = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed },
};

export const FLOW_CONFIG = {
  minZoom: 0.1,
  maxZoom: 10,
  defaultViewport: { x: 0, y: 0, zoom: 0.8 },
};
