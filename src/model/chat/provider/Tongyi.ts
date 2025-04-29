import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Tongyi extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(TongyiProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url:
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
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
const TongyiProvider: ChatModelProvider = {
  name: "通义千问",
  description: "阿里通义千问",
  icon: "qwen-color.svg",
  models: {
    "qwen3-235b-a22b": {
      name: "qwen3-235b-a22b",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 128000,
      description: "通义千问-Turbo - 入门级模型，适合一般任务",
    },

    "qwen3-30b-a3b": {
      name: "qwen3-30b-a3b",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 128000,
      description:
        "实现思考模式和非思考模式的有效融合，可在对话中切换模式。推理能力以更小参数规模比肩QwQ-32B、通用能力显著超过Qwen2.5-14B，达到同规模业界SOTA水平。",
    },
    "qwen-turbo": {
      name: "qwen-turbo",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 1000000,
      description: "通义千问-Turbo - 入门级模型，适合一般任务",
    },
    "qwen-plus": {
      name: "qwen-plus",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 131072,
      description: "通义千问-Plus - 性能均衡的模型，适合大部分场景",
    },
    "qwen-max": {
      name: "qwen-max",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32768,
      description: "通义千问-Max - 高性能模型，适合复杂任务",
    },
    "qwq-plus": {
      name: "qwq-plus",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 131072,
      reasoner: true,
      description:
        "QWQ基于 Qwen2.5 模型训练的 QwQ 推理模型，通过强化学习大幅度提升了模型推理能力。",
    },
    "qwen-long": {
      name: "qwen-long",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 10000000,
      description: "通义千问-Max长上下文 - 支持超大上下文的高性能模型",
    },
  },
  create: (model_name: string) => new Tongyi(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(TongyiProvider);
