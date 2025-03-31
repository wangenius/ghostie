import { ModelInfo } from "@common/types/agent";
import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody } from "@/model/types/model";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Deepseek extends ChatModel {
  constructor(config?: Partial<ModelInfo>) {
    const api_key = ModelManager.getApiKey(DeepseekProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      ...config,
      api_key,
      api_url: "https://api.deepseek.com/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合Deepseek规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // Deepseek使用OpenAI兼容的API格式，不需要特殊处理
    return body;
  }
}

// 注册Deepseek提供商
const DeepseekProvider: ModelProvider = {
  name: "Deepseek",
  description: "Deepseek (深度求索大模型)",
  models: {
    "deepseek-chat": {
      name: "deepseek-chat",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 32000,
      description: "Deepseek Chat - 通用对话模型",
    },
    "deepseek-coder": {
      name: "deepseek-coder",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 32000,
      description: "Deepseek Coder - 专为代码优化的模型",
    },
    "deepseek-llm-67b-chat": {
      name: "deepseek-llm-67b-chat",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 32000,
      description: "Deepseek LLM 67B - 大参数通用模型",
    },
    "deepseek-math": {
      name: "deepseek-math",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "Deepseek Math - 数学推理专用模型",
    },
  },
  create: () => new Deepseek(),
};

// 注册到ChatModel
ModelManager.registerProvider(DeepseekProvider);
