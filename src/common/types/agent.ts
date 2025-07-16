/** 模型配置*/
export interface ModelItem {
  provider: string;
  name: string;
}
// 只保留main独有的类型定义
export interface ExecuteOptions {
  images?: string[];
  extra?: string;
}

/** 模型类型 */
export enum ModelType {
  Chat = "chat",
  Vision = "vision",
  Image = "image",
  Audio = "audio",
  Video = "video",
  Embedding = "embedding",
}

export interface AgentChatOptions {
  images?: { contentType: string; base64Image: string }[];
}

export interface AgentToolProps {
  plugin: string;
  tool: string;
}

export interface AgentMCPProps {
  server: string;
  tool: string;
}

/** 代理配置信息 */
export interface AgentProps {
  /* 助手id */
  id: string;
  /* 名称 */
  name: string;
  /* 描述 */
  description: string;
  /* 头像 */
  avatar?: string;
  /* 系统提示 */
  system: string;
  /* Agent模式, 包括react、plan、reason等等 */
  engine?: string;
  /* 助手版本 */
  version: string;
  /* 模型能力 */
  models: {
    [key in ModelType]?: ModelItem;
  };
  /* 可调用的工具 */
  tools: AgentToolProps[];
  /* 可调用的MCP */
  mcps: AgentMCPProps[];
  /* 知识库 */
  knowledges: string[];
  /* 工作流 */
  workflows: string[];
  /* 允许调用的其他agents */
  agents: string[];
  /* 可调用的技能 */
  skills: string[];
  /* 配置 */
  configs?: {
    /* 温度 */
    temperature?: number;
  };
}

export const DEFAULT_AGENT: AgentProps = {
  id: "",
  name: "",
  system: "",
  description: "",
  version: "0.0.1",
  engine: "react",
  models: {},
  tools: [],
  mcps: [],
  knowledges: [],
  workflows: [],
  agents: [],
  skills: [],
};
