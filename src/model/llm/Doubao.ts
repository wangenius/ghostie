import { ChatModelRequestBody } from "@/model/types/model";
import { ModelInfo } from "@common/types/agent";
import { ChatModel } from "../ChatModel";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Doubao extends ChatModel {
  constructor(config?: Partial<ModelInfo>) {
    const api_key = ModelManager.getApiKey(DoubaoProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      ...config,
      api_key,
      api_url: "https://api.doubao.com/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合豆包规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 豆包使用OpenAI兼容的API格式，可能需要一些特殊处理
    const doubaoBody = { ...body };

    return doubaoBody;
  }
}

// 注册豆包提供商
const DoubaoProvider: ModelProvider = {
  name: "豆包",
  description: "豆包 (智谱AI大语言模型)",
  models: {
    "doubao-pro": {
      name: "doubao-pro",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "豆包Pro - 专业版本，支持复杂任务",
    },
    "doubao-lite": {
      name: "doubao-lite",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description: "豆包Lite - 轻量版本，响应速度快",
    },
    "doubao-8b": {
      name: "doubao-8b",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 8000,
      description: "豆包8B - 小参数模型，适合简单对话",
    },
  },
  create: () => new Doubao(),
};

// 注册到ChatModel
ModelManager.registerProvider(DoubaoProvider);
