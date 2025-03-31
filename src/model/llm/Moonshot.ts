import { ModelInfo } from "@common/types/agent";
import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody } from "@/model/types/model";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Moonshot extends ChatModel {
  constructor(config?: Partial<ModelInfo>) {
    const api_key = ModelManager.getApiKey(MoonshotProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      ...config,
      api_key,
      api_url: "https://api.moonshot.cn/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合Moonshot规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // Moonshot使用与OpenAI兼容的API格式
    return body;
  }
}

// 注册Moonshot提供商
const MoonshotProvider: ModelProvider = {
  name: "Moonshot",
  description: "月之暗面 (Moonshot AI)",
  models: {
    "moonshot-v1-32k": {
      name: "moonshot-v1-32k",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "Moonshot V1 - 强大的通用大语言模型",
    },
    "moonshot-v1-128k": {
      name: "moonshot-v1-128k",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "Moonshot V1 (128K) - 支持超长上下文窗口的版本",
    },
    "moonshot-v1-plus": {
      name: "moonshot-v1-plus",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "Moonshot Plus - 性能增强版",
    },
    "moonshot-v1-8k": {
      name: "moonshot-v1-8k",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 8000,
      description: "Moonshot V1 (8K) - 标准版本，适合一般任务",
    },
  },
  create: () => new Moonshot(),
};

// 注册到ChatModel
ModelManager.registerProvider(MoonshotProvider);
