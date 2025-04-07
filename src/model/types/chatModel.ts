import { FunctionCallProps } from "../../plugin/types";

/** 消息角色类型
 * system: 系统消息
 * user: 用户消息
 * assistant: 助手消息
 * tool: 工具消息(工具调用消息)
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/** 大模型返回的函数调用信息 */
export interface FunctionCallReply {
  /* 名称 */
  name: string;
  /* 参数 */
  arguments: string;
}

/** 工具调用信息 */
export interface ToolCallReply {
  id: string;
  function: FunctionCallReply;
  index: number;
  type: "function";
}

/** 消息原型,一般用于调用的接口 */
export interface MessagePrototype {
  /* 角色 */
  role: MessageRole;
  /* 内容 */
  content: string;
  /* 工具调用请求, 用于工具调用 */
  tool_calls?: ToolCallReply[];
  /* 工具调用ID, 用于工具调用结果 */
  tool_call_id?: string;
}
/** 消息接口 */
export interface MessageItem extends MessagePrototype {
  /* 是否隐藏 */
  hidden?: boolean;
  /* loading */
  loading?: boolean;
  /* 工具调用加载 */
  tool_loading?: boolean;
  /* 错误 */
  error?: string;
  /* reasoner */
  reasoner?: string;
  /* 创建时间 */
  created_at: number;
  /* 图片 */
  images?: string[];
  /* 补充内容 */
  extra?: string;
}

/** 工具调用结果信息 */
export interface FunctionCallResult<T = any, R = any> {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  arguments: T;
  /** 工具执行结果 */
  result: R;
}

/** 工具请求体 */
export interface FunctionRequestBody {
  type: "function";
  function: FunctionCallProps;
}

export type ToolRequestBody = FunctionRequestBody[];

/** 消息请求体, 用于发送给模型, 是LLM API的请求体 */
export interface ChatModelRequestBody {
  /* 模型 */
  model: string;
  /* 消息 */
  messages: MessagePrototype[];
  /* 流式 */
  stream?: boolean;
  /* 工具 */
  tools?: ToolRequestBody;
  /* 温度 */
  temperature?: number;
  /* 响应格式 */
  response_format?: {
    type: string;
  };
  /* 并行工具调用 */
  parallel_tool_calls?: boolean;
}

/** 模型响应
 * @param T 响应类型
 * @param ToolArguments 工具调用参数类型
 * @param ToolResult 工具调用结果类型
 * @param body 响应体
 * @param stop 停止方法
 * @param tool 工具调用
 */

export interface ChatModelResponse<
  T = string,
  ToolArguments = any,
  ToolResult = any,
> {
  /* 响应体 */
  body: T;
  /* 停止方法 */
  stop: () => void;
  /* 工具调用结果 */
  tool?: FunctionCallResult<ToolArguments, ToolResult>;
}
