import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Moonshot extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(MoonshotProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
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
const MoonshotProvider: ChatModelProvider = {
  name: "Moonshot",
  description: "月之暗面",
  icon: "moonshot.svg",
  models: {
    "moonshot-v1-8k": {
      name: "moonshot-v1-8k",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 8192,
      description: "Moonshot V1 (8K) - 标准版本，适合一般任务",
    },
    "moonshot-v1-32k": {
      name: "moonshot-v1-32k",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32768,
      description: "Moonshot V1 - 强大的通用大语言模型",
    },
    "moonshot-v1-128k": {
      name: "moonshot-v1-128k",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 131072,
      description: "Moonshot V1 (128K) - 支持超长上下文窗口的版本",
    },
  },
  create: (model_name: string) => new Moonshot(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(MoonshotProvider);
