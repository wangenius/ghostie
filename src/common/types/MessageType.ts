// 会话使用的Message
export { type CoreMessage } from "ai";

/** 流式响应回调函数类型 */
export interface OnChunk {
  
  completion?: string;
  reasoner?: string;
}

// 存储的memory消息结构，与前端保持一致
// 同时也用作MessageItem的别名
export type MessageItem = MemoryMessage;
/**
 * 消息内容类型
 */
export type MessageContentType =
  | "text"
  | "image"
  | "file"
  | "audio"
  | "video"
  | "tool-call"
  | "tool-result"
  | "reasoning";

/**
 * 消息内容项
 */
export interface MessageContent {
  type: MessageContentType;
  content: any;
}

/**
 * 消息角色
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * 内存消息接口
 */
export interface MemoryMessage {
  // 唯一ID
  id?: string;
  // 角色
  role: MessageRole;
  // 内容
  content: string;
  // 创建时间
  created_at: number;
  // 更新时间
  updated_at?: number;
  // 额外信息
  extra?: string;
  // 图片
  images?: string[];
  // 工具调用
  tool_calls?: any[];
  // 工具调用ID
  tool_call_id?: string;
  // 推理内容
  reasoner?: string;
  // 加载状态
  loading?: boolean;
  // 工具加载状态
  tool_loading?: boolean;
  // 错误信息
  error?: string;
  // 是否隐藏
  hidden?: boolean;
}
