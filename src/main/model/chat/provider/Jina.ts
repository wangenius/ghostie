import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Jina extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(JinaProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://deepsearch.jina.ai/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合通义规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected RequestBodyAdapter(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 通义特有的请求体处理，例如添加特定参数或调整请求结构
    // 当前版本暂时保持相似的格式，仅作为示例
    const tongyiBody = { ...body };

    // 可能需要调整工具格式
    if (tongyiBody.tools) {
      // 根据通义API的工具格式进行调整
    }

    return tongyiBody;
  }
}

// 注册通义提供商
const JinaProvider: ChatModelProvider = {
  name: "Jina",
  description: "Jina",
  icon: "jina.svg",
  models: {
    "jina-deepsearch-v1": {
      name: "jina-deepsearch-v1",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 1000000,
      description: "Jina DeepSearch",
    },
  },
  create: (model_name: string) => new Jina(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(JinaProvider);
