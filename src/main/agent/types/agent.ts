// 从common中导入共享的类型定义
export type {
  ModelItem,
  ModelType,
  AgentChatOptions,
  AgentToolProps,
  AgentMCPProps,
  AgentInfos,
  AgentUsedData
} from "../../../common/types/agent";

export { DEFAULT_AGENT } from "../../../common/types/agent";

// 只保留main独有的类型定义
export interface ExecuteOptions {
  images?: string[];
  extra?: string;
}

// 导入AgentInfos类型用于使用
import type { AgentInfos } from "../../../common/types/agent";

/** 代理市场配置 */
export interface AgentMarketProps {
  /* 助手id */
  id: string;
  /* 助手名称 */
  name: string;
  /* 助手版本 */
  version: string;
  /* 助手创建时间 */
  inserted_at: string;
  /* 助手更新时间 */
  updated_at: string;
  /* 助手作者 */
  user_id: string;
  /* 助手描述 */
  description: string;
  /* 助手配置 */
  body: AgentInfos;
}
