import { ImageModelRequestBody } from "@/model/types/imageModel";
import { ImageModel } from "../ImageModel";
import { ImageModelManager, ImageModelProvider } from "../ImageModelManager";

export class OpenAI extends ImageModel {
  constructor(model: string) {
    const api_key = ImageModelManager.getApiKey(OpenAIProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      post_url: "https://api.openai.com/v1/images/generations",
      get_url: "https://api.openai.com/v1/images/generations/",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合OpenAI规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ImageModelRequestBody,
  ): ImageModelRequestBody {
    return {
      ...body,
    };
  }

  /**
   * 解析OpenAI的响应格式
   * @param payload 原始响应数据
   * @returns 解析后的内容
   */
  protected parseResponseBody(payload: string): {
    completion?: string;
    images?: string[];
  } {
    try {
      // OpenAI 图像生成响应格式
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      // 提取内容
      const completion = delta?.content;
      // 提取图像
      const images = delta?.images;
      return { completion, images };
    } catch (error) {
      return {};
    }
  }
}

// 注册OpenAI提供商
const OpenAIProvider: ImageModelProvider = {
  name: "openai-image",
  description: "OpenAI 图像生成模型",
  icon: "openai.svg",
  models: {
    "dall-e-2": {
      name: "dall-e-2",
      supportStream: false,
      sizes: ["256x256", "512x512", "1024x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "vivid"],
      maxN: 10,
      contextWindow: 1000,
      description: "OpenAI DALL-E 2 模型",
    },
    "dall-e-3": {
      name: "dall-e-3",
      supportStream: false,
      sizes: ["1024x1024", "1024x1792", "1792x1024"],
      qualities: ["standard", "hd"],
      styles: ["natural", "vivid"],
      maxN: 1,
      contextWindow: 4000,
      description: "OpenAI DALL-E 3 模型",
    },
  },
  create: (model_name: string) => new OpenAI(model_name),
};

// 注册到ImageModel
ImageModelManager.registerProvider(OpenAIProvider);
