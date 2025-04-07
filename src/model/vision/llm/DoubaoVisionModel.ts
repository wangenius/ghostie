/** 豆包视觉模型 */
import { VisionModel } from "../VisionModel";
import {
  VisionModelInfo,
  VisionModelRequestBody,
  VisionModelProps,
  VisionModelProvider,
} from "@/model/types/visionModel";
import { VisionModelManager } from "../VisionModelManager";

/** 豆包视觉模型 */
export class DoubaoVisionModel extends VisionModel {
  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: VisionModelInfo) {
    super(config);
  }

  /**
   * 准备请求体，添加豆包特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: VisionModelRequestBody,
  ): VisionModelRequestBody {
    return {
      ...body,
      max_tokens: 32768,
    };
  }

  /**
   * 解析响应体，处理豆包的响应格式
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

/** 豆包视觉模型提供商 */
export const DoubaoVisionProvider: VisionModelProvider = {
  name: "doubao-vision",
  description: "豆包的视觉理解模型",
  icon: "doubao-color.svg",
  models: {
    "doubao-1.5-vision-pro-32k-250115": {
      name: "doubao-1.5-vision-pro-32k-250115",
      supportStream: true,
      supportReasoner: true,
      maxImageSize: 20,
      supportedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
      description: "豆包1.5视觉专业版模型",
    },
  },
  create: (name: string) => {
    return new DoubaoVisionModel({
      api_key: VisionModelManager.getApiKey("doubao-vision"),
      api_url: "https://api.doubao.com/v1/chat/completions",
      model: name,
    });
  },
};

// 注册豆包视觉模型提供商
VisionModelManager.registerProvider(DoubaoVisionProvider);
