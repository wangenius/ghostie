/** 通义千问VL模型 */
import {
  VisionModelProvider,
  VisionModelRequestBody,
} from "@/model/types/visionModel";
import { VisionModel } from "../VisionModel";
import { VisionModelManager } from "../VisionModelManager";

/** 通义千问VL模型 */
export class QianwenVisionModel extends VisionModel {
  /** 构造函数
   * @param config 模型配置
   */
  constructor(model: string) {
    super({
      api_key: VisionModelManager.getApiKey("tongyi-vl"),
      api_url:
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      model,
    });
  }

  /**
   * 准备请求体，添加通义千问特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: VisionModelRequestBody,
  ): VisionModelRequestBody {
    return {
      ...body,
      max_tokens: 4096,
    };
  }

  /**
   * 解析响应体，处理通义千问的响应格式
   * @param payload 原始响应数据字符串
   * @returns 解析后的内容
   */
  protected parseResponseBody(payload: string): {
    completion?: string;
    reasoner?: string;
  } {
    try {
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      const completion = delta?.content;
      return { completion };
    } catch (error) {
      return {};
    }
  }
}

/** 通义千问视觉模型提供商 */
export const QianwenVisionProvider: VisionModelProvider = {
  name: "tongyi-vl",
  description: "通义千问的视觉理解模型",
  icon: "qwen-color.svg",
  models: {
    "qwen-vl-plus-latest": {
      name: "qwen-vl-plus-latest",
      supportStream: true,
      supportReasoner: true,
      maxImageSize: 10,
      supportedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
      description: "通义千问VL Plus模型",
    },
  },
  create: (name: string) => {
    return new QianwenVisionModel(name);
  },
};

// 注册通义千问视觉模型提供商
VisionModelManager.registerProvider(QianwenVisionProvider);
