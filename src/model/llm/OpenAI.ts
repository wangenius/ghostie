import { ChatModelRequestBody } from "@/model/types/model";
import { ChatModel } from "../ChatModel";
import { ModelManager, ModelProvider } from "../ModelManager";

export class OpenAI extends ChatModel {
  constructor(model: string) {
    const api_key = ModelManager.getApiKey(OpenAIProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.openai.com/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合OpenAI规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // OpenAI特有的请求体处理，例如添加特定参数
    // 当前OpenAI使用通用的请求体格式，所以没有特殊处理
    return body;
  }
}

// 注册OpenAI提供商
const OpenAIProvider: ModelProvider = {
  name: "OpenAI",
  description: "OpenAI API",
  icon: "openai.svg",
  models: {
    "gpt-3.5-turbo": {
      name: "gpt-3.5-turbo",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description: "GPT-3.5 Turbo - 快速且经济的模型",
    },
    "gpt-4": {
      name: "gpt-4",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 8000,
      description: "GPT-4 - 更强的大语言模型，能够理解并生成自然语言或代码",
    },
    "gpt-4-turbo": {
      name: "gpt-4-turbo",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "GPT-4 Turbo - 比GPT-4更快且性能略高的模型",
    },
    "gpt-4o": {
      name: "gpt-4o",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "GPT-4o - OpenAI最新的全能模型",
    },
  },
  create: (model_name: string) => new OpenAI(model_name),
};

// 注册到ChatModel
ModelManager.registerProvider(OpenAIProvider);
