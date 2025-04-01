import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class SiliconFlow extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(SiliconFlowProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.siliconflow.cn/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合硅流规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 硅流使用与OpenAI兼容的API格式
    return body;
  }
}

// 注册硅流提供商
const SiliconFlowProvider: ChatModelProvider = {
  name: "硅流",
  description: "硅流",
  icon: "siliconcloud-color.svg",
  models: {
    "abab-5.5-chat": {
      name: "abab-5.5-chat",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "ABAB-5.5 - 硅流强大的通用大模型",
    },
    "abab-5.5-lite": {
      name: "abab-5.5-lite",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description: "ABAB-5.5-Lite - 轻量级版本",
    },
    "abab-coding": {
      name: "abab-coding",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "ABAB-Coding - 专为代码生成和理解优化",
    },
  },
  create: (model_name: string) => new SiliconFlow(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(SiliconFlowProvider);
