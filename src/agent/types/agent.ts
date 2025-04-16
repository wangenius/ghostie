/** 模型配置*/
export interface AgentModelProps {
  /* 模型提供商 */
  provider: string;
  /* 模型名称 */
  name: string;
}

/** 模型类型 */
export type ModelType =
  | "text"
  | "vision"
  | "image"
  | "audio"
  | "video"
  | "embedding";

export interface AgentChatOptions {
  images?: { contentType: string; base64Image: string }[];
}
export interface EngineOptions {
  images?: string[];
  extra?: string;
}
export interface AgentToolProps {
  plugin: string;
  tool: string;
}
export interface AgentMCPProps {
  server: string;
  tool: string;
}

/** 代理配置信息
 * @param name 名称
 * @param system 系统提示
 * @param model 模型
 * @param plugins 插件
 */
export interface AgentProps {
  /* 助手id */
  id: string;
  /* 名称 */
  name: string;
  /* 描述 */
  description?: string;
  /* 头像 */
  avatar?: string;
  /* 系统提示 */
  system: string;
  /* Agent模式, 包括react、plan、reason等等 */
  engine?: string;
  /* 模型能力 */
  models?: {
    [key in ModelType]?: AgentModelProps;
  };
  /* 可调用的工具 */
  tools: AgentToolProps[];
  /* 可调用的MCP */
  mcps: AgentMCPProps[];
  /* 知识库 */
  knowledges: string[];
  /* 工作流 */
  workflows: string[];
  /* 配置 */
  configs?: {
    /* 温度 */
    temperature?: number;
  };
}

/** 代理使用数据 */
export interface AgentUsedData {
  /* 置顶 */
  pinned?: boolean;
  /* 使用次数 */
  usageCount?: number;
  /* 最后使用时间 */
  lastUsed?: number;
}

/** 代理市场配置 */
export interface AgentMarketProps {
  /* 助手id */
  id: string;
  /* 助手名称 */
  name: string;
  /* 助手创建时间 */
  inserted_at: string;
  /* 助手更新时间 */
  updated_at: string;
  /* 助手作者 */
  user_id: string;
  /* 助手描述 */
  description: string;
  /* 助手配置 */
  body: AgentProps;
}
