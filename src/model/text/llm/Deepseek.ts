import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Deepseek extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(DeepseekProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.deepseek.com/chat/completions",
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
const DeepseekProvider: ChatModelProvider = {
  name: "Deepseek",
  description: "Deepseek (深度求索大模型)",
  icon: "deepseek-color.svg",
  models: {
    "deepseek-chat": {
      name: "deepseek-chat",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 64000,
      description: "Deepseek Chat - 通用对话模型",
    },
    "deepseek-reasoner": {
      name: "deepseek-reasoner",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 64000,
      description: "Deepseek Reasoner - 推理模型",
    },
  },
  create: (model_name: string) => new Deepseek(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(DeepseekProvider);
