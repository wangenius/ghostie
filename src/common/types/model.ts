import { FunctionCallProps } from "./plugin";
/** 模型 */
export interface Model {
  /* 唯一标识,用于存储和识别 */
  id: string;
  /* 名称 */
  name: string;
  /* API密钥 */
  api_key: string;
  /* API URL */
  api_url: string;
  /* 模型 */
  model: string;
}

/** 消息角色类型 */
export type MessageRole = "system" | "user" | "assistant" | "function";

/** 大模型返回的函数调用信息 */
export interface FunctionCallReply {
  /* 名称 */
  name: string;
  /* 参数 */
  arguments: string;
}

/** 消息类型 */
export type MessageType =
  | "system"
  | "user:input"
  | "user:hidden"
  | "assistant:loading"
  | "assistant:reply"
  | "assistant:tool"
  | "assistant:warning"
  | "function:result";

/** 消息原型 */
export interface MessagePrototype {
  /* 角色 */
  role: MessageRole;
  /* 内容 */
  content: string;
  /* 名称 */
  name?: string;
  /* 函数调用 */
  function_call?: FunctionCallReply;
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

/** 消息请求体, 用于发送给模型, 是LLM API的请求体 */
export interface ChatModelRequestBody {
  /* 模型 */
  model: string;
  /* 消息 */
  messages: MessagePrototype[];
  /* 流式 */
  stream?: boolean;
  /* 工具 */
  functions?: FunctionCallProps[];
  /* 响应格式 */
  response_format?: {
    type: string;
  };
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
  ToolResult = any
> {
  /* 响应体 */
  body: T;
  /* 停止方法 */
  stop: () => void;
  /* 工具调用结果 */
  tool?: FunctionCallResult<ToolArguments, ToolResult>;
}
