import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody, ToolCallReply } from "@/model/types/model";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Hunyuan extends ChatModel {
  constructor(model: string) {
    const api_key = ModelManager.getApiKey(HunyuanProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://hunyuan.tencentcloudapi.com/",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合混元规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 混元API有特殊格式
    const hunyuanBody = { ...body };

    // 需要进行特殊处理，转换成混元API所需的格式
    // 例如调整消息结构、添加特殊参数等

    return hunyuanBody;
  }

  /**
   * 解析混元响应体格式
   * @param payload 原始响应数据字符串
   * @returns 统一格式的解析结果
   */
  protected parseResponseBody(payload: string): {
    content?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      // 解析混元的响应格式
      const data = JSON.parse(payload.replace("data: ", ""));

      let content = undefined;
      let reasoner = undefined;
      let tool_call = undefined;

      // 处理文本内容
      // 混元的流式响应格式可能是 data.Choices[0].Delta.Content
      if (data.Choices?.[0]?.Delta?.Content) {
        content = data.Choices[0].Delta.Content;
      }

      // 处理工具调用
      // 混元的工具调用格式可能是 data.Choices[0].Delta.ToolCalls
      if (data.Choices?.[0]?.Delta?.ToolCalls?.[0]) {
        const toolCall = data.Choices[0].Delta.ToolCalls[0];
        tool_call = {
          id: toolCall.Id || `tool_${Date.now()}`,
          index: 0,
          type: "function" as const,
          function: {
            name: toolCall.Function?.Name,
            arguments: toolCall.Function?.Arguments || "{}",
          },
        };
      }

      return {
        content,
        reasoner,
        tool_call,
      };
    } catch (error) {
      console.error("Error parsing Hunyuan response:", error);
      return {};
    }
  }
}

// 注册混元提供商
const HunyuanProvider: ModelProvider = {
  name: "混元",
  description: "腾讯混元",
  icon: "hunyuan-color.svg",
  models: {
    "hunyuan-lite": {
      name: "hunyuan-lite",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 6000,
      description: "混元Lite - 轻量版本，响应速度快",
    },
    "hunyuan-pro": {
      name: "hunyuan-pro",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "混元Pro - 高性能版本，支持复杂任务",
    },
    "hunyuan-standard": {
      name: "hunyuan-standard",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description: "混元标准版 - 平衡性能与成本",
    },
    "hunyuan-turbo": {
      name: "hunyuan-turbo",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 32000,
      description: "混元Turbo - 高速版本，针对实时场景优化",
    },
  },
  create: (model_name: string) => new Hunyuan(model_name),
};

// 注册到ChatModel
ModelManager.registerProvider(HunyuanProvider);
