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
  /** 如果是对象类型，可以包含子属性 */
  properties?: Record<string, ToolProperty>;
  /** 如果是数组类型，可以定义数组元素的类型 */
  items?: ToolProperty;
}

export type ToolParameters = {
  /** 参数类型，固定为 object */
  type: "object";
  /** 参数属性定义 */
  properties: Record<string, ToolProperty>;
  /** 必填参数列表 */
  required: string[];
};

/**
 * 工具函数信息, 存储在ToolFunction中
 * @param name 工具函数名称
 * @param description 工具函数描述
 * @param parameters 工具函数参数
 */
export interface FunctionCallProps {
  /* 工具函数名称 */
  name: string;
  /* 工具函数描述 */
  description: string;
  /* 工具函数参数, 如果不存在, 则表示没有参数 */
  parameters?: ToolParameters;
}

/**
 * 工具信息
 */
export interface ToolProps extends FunctionCallProps {
  /* 插件id, 用于识别 */
  plugin: string;
}

/**
 * 插件信息
 */
export interface PluginProps {
  /* 插件id, 用于识别 */
  id: string;
  /* 插件名称 */
  name: string;
  /* 插件描述 */
  description: string;
  /* 插件版本 */
  version: string;
  /* 插件作者 */
  author?: string;
  /* 工具列表 */
  tools: ToolProps[];
}
