// 会话使用的Message
export { type CoreMessage } from "ai";

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
export interface AgentMessageContent {
  type: MessageContentType;
  content: any;
}

export type UserMessageContentType = "text" | "extra" | "images" | "files";

export interface UserMessageContent {
  type: UserMessageContentType;
  content: string;
}

export interface BaseMemoryMessage {
  created_at: number;
  updated_at: number;
}

export interface UserMemoryMessage extends BaseMemoryMessage {
  from: "user";
  content: UserMessageContent[];
}

export interface AgentMemoryMessage extends BaseMemoryMessage {
  from: "agent";
  content: AgentMessageContent[];
}

export interface SystemMemoryMessage {
  from: "system";
  content: string;
}
/**
 * 内存消息接口
 */
export type MemoryMessage =
  | UserMemoryMessage
  | AgentMemoryMessage
  | SystemMemoryMessage;
