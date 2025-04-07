import { ModelProvider, ModelProviderList } from "./model";
import { VisionModel } from "../vision/VisionModel";

/** 视觉模型请求体 */
export interface VisionModelRequestBody {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: VisionMessage[];
  /** 温度 */
  temperature?: number;
  /** 最大token数 */
  max_tokens?: number;
  /** 流式响应 */
  stream?: boolean;
}

/** 视觉消息 */
export interface VisionMessage {
  /** 角色 */
  role: "user" | "assistant" | "system";
  /** 内容 */
  content: string | VisionContent[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
}

/** 视觉内容 */
export interface VisionContent {
  /** 类型 */
  type: "text" | "image_url";
  /** 文本内容 */
  text?: string;
  /** 图片URL */
  image_url?: {
    /** URL */
    url: string;
    /** 详情 */
    detail?: "low" | "high";
  };
}

/** 视觉模型响应 */
export interface VisionModelResponse<T> {
  /** 内容 */
  content: T;
  /** 推理过程 */
  reasoner?: string;
  /** 错误信息 */
  error?: string;
  /** 停止方法 */
  stop: () => Promise<void>;
}

/** 视觉模型信息 */
export interface VisionModelInfo {
  /** 模型名称 */
  model: string;
  /** API密钥 */
  api_key: string;
  /** API地址 */
  api_url: string;
}

/** 视觉模型能力接口 */
export interface VisionModelProps {
  /** 模型名称 */
  name: string;
  /** 是否支持流式输出 */
  supportStream: boolean;
  /** 是否支持推理能力 */
  supportReasoner?: boolean;
  /** 最大图片大小(MB) */
  maxImageSize?: number;
  /** 支持的图片格式 */
  supportedFormats?: string[];
  /** 描述 */
  description: string;
}

/** 视觉模型提供商接口 */
export type VisionModelProvider = ModelProvider<VisionModelProps, VisionModel>;

/** 视觉模型提供商列表 */
export type VisionModelProviderList = ModelProviderList<VisionModelProvider>;
