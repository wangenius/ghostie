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

/** 消息类型 */
export enum MessageType {
  /** 系统消息 - 用于设置系统级别的提示和配置 */
  SYSTEM = "system",
  /** 用户输入消息 - 用户的主动输入 */
  USER_INPUT = "user:input",
  /** 用户隐藏消息 - 系统内部流转的用户消息，不显示给用户 */
  USER_HIDDEN = "user:hidden",
  /** 助手加载消息 - 表示助手正在处理中 */
  ASSISTANT_PENDING = "assistant:pending",
  /** 助手回复消息 - 助手的标准回复 */
  ASSISTANT_REPLY = "assistant:reply",
  /** 助手工具消息 - 助手调用工具时的消息 */
  ASSISTANT_TOOL = "assistant:tool",
  /** 助手处理消息 - 助手处理中间步骤的消息 */
  ASSISTANT_PROCESS = "assistant:process",
  /** 助手错误消息 - 助手处理出错时的消息 */
  ASSISTANT_ERROR = "assistant:error",
  /** 工具执行结果消息 - 工具函数执行后的结果 */
  TOOL_RESULT = "tool:result",
  /** 助手推理消息 - 助手推理后的消息 */
  ASSISTANT_REASONING = "assistant:reasoning",
}

/** 消息原型 */
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
export interface Message extends MessagePrototype {
  /* 消息类型 */
  type: MessageType;
  /* 创建时间 */
  created_at: number;
}
/** 工具获取器
 * 可以是字符串, symbol, 函数, 对象
 */
export type ToolFunctionHandler = string | symbol | Function | { name: string };

/** 工具调用信息 */
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
