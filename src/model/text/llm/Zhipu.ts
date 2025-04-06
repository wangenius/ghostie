import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Zhipu extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(ZhipuProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合智谱规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 智谱API可能有特殊格式需求
    const zhipuBody = { ...body };

    return zhipuBody;
  }
}

// 注册智谱提供商
const ZhipuProvider: ChatModelProvider = {
  name: "智谱",
  description: "智谱AI",
  icon: "zhipu-color.svg",
  models: {
    "glm-4": {
      name: "glm-4",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "GLM-4 - 最新一代通用大模型",
    },
    "glm-4-vision": {
      name: "glm-4-vision",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "GLM-4-Vision - 支持多模态的视觉模型",
    },
    "glm-3-turbo": {
      name: "glm-3-turbo",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 32000,
      description: "GLM-3-Turbo - 高性能模型，适合一般任务",
    },
    "cogview-3": {
      name: "cogview-3",
      supportJson: true,
      supportStream: false,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 4000,
      description: "CogView-3 - 文生图模型",
    },
  },
  create: (model_name: string) => new Zhipu(model_name),
};

// 注册到ChatModel
// ChatModelManager.registerProvider(ZhipuProvider);
