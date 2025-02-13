export type ModelName = string;
/** 模型 */
export interface Model {
  /* 名称: 唯一标识,用于存储和识别 */
  name?: ModelName;
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

/** 消息接口 */
export interface Message {
  /* 角色 */
  role: MessageRole;
  /* 内容 */
  content: string;
  /* 名称 */
  name?: string;
  /* 函数调用 */
  function_call?: FunctionCallReply;
}

/** 工具获取器
 * 可以是字符串, symbol, 函数, 对象
 */
export type ToolFunctionHandler = string | symbol | Function | { name: string };

/**
 * 工具函数信息, 存储在ToolFunction中
 * @param name 工具函数名称
 * @param description 工具函数描述
 * @param parameters 工具函数参数
 */
export interface ToolFunctionInfo {
  /* 工具函数名称 */
  name: string;
  /* 工具函数描述 */
  description: string;
  /* 工具函数参数 */
  parameters: {
    /** 参数类型，固定为 object */
    type: "object";
    /** 参数属性定义 */
    properties: Record<string, ToolProperty>;
    /** 必填参数列表 */
    required: string[];
  };
}

/** 工具依赖 */
export interface PackageInfo {
  /* 名称 */
  name: string;
  /* 版本 */
  version: string;
  /* 描述 */
  description?: string;
  /* 脚本 */
  script: string;
}

/**
 * 工具参数, 存储在Tool.ToolStore中, 包括script
 * script: 工具脚本
 */
export interface ToolProps {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** Deno 脚本内容 */
  content: string;
  /** 依赖的包 */
  dependencies?: string[];
  /** 参数定义 */
  parameters?: Record<string, ToolProperty>;
}

/**
 * 工具函数, 注册在Tool.ToolStore中
 * @param info 工具函数信息
 * @param fn 工具函数
 */
export interface ToolFunction<TArgs = any, TResult = any> {
  /* 工具函数信息 */
  info: ToolFunctionInfo;
  /* 工具函数 */
  fn: (args: TArgs) => Promise<TResult>;
}

/** 工具函数参数类型 */
export type ToolPropertyType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

/**
 * 工具函数参数类型
 */
export interface ToolProperty {
  /** 参数类型 */
  type: ToolPropertyType;
  /** 参数描述 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 如果是对象类型，可以包含子属性 */
  properties?: Record<string, ToolProperty>;
  /** 如果是数组类型，可以定义数组元素的类型 */
  items?: ToolProperty;
}

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
  messages: Message[];
  /* 流式 */
  stream?: boolean;
  /* 工具 */
  functions?: ToolFunctionInfo[];
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

// /** 工具函数执行结果
//  * @param T 工具函数执行结果类型
//  * @param name 工具函数名称
//  * @param arguments 工具函数参数
//  * @returns 工具函数执行结果
//  */
// export interface FunctionCallResponse<T = any, R = any> {
//     /* 工具函数名称 */
//     name: string;
//     /* 工具函数参数 */
//     arguments: T;
//     /* 工具函数回复 */
//     reply: string;
//     /* 工具函数执行结果 */
//     result: R;
// }
