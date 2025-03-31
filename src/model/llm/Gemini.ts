import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody, ToolCallReply } from "@/model/types/model";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Gemini extends ChatModel {
  constructor(model: string) {
    const api_key = ModelManager.getApiKey(GeminiProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://generativelanguage.googleapis.com/v1beta/models",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合Gemini规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // Gemini使用特殊的API格式，需要调整
    const geminiBody = { ...body };

    // 这里需要根据Google AI API的实际格式进行转换
    // 例如调整消息格式、参数名称等

    return geminiBody;
  }

  /**
   * 解析Gemini响应体格式
   * @param payload 原始响应数据字符串
   * @returns 统一格式的解析结果
   */
  protected parseResponseBody(payload: string): {
    content?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      // 解析Gemini的响应格式
      const data = JSON.parse(payload.replace("data: ", ""));

      let content = undefined;
      let reasoner = undefined;
      let tool_call = undefined;

      // 处理文本内容
      if (data.candidates?.[0]?.content?.parts) {
        const textPart = data.candidates[0].content.parts.find(
          (part: any) => part.text,
        );

        if (textPart) {
          content = textPart.text;
        }
      }

      // 处理工具调用
      if (data.candidates?.[0]?.content?.parts) {
        const functionPart = data.candidates[0].content.parts.find(
          (part: any) => part.functionCall,
        );

        if (functionPart?.functionCall) {
          tool_call = {
            id: functionPart.functionCall.name || "function_call_id",
            index: 0,
            type: "function" as const,
            function: {
              name: functionPart.functionCall.name,
              arguments: JSON.stringify(functionPart.functionCall.args || {}),
            },
          };
        }
      }

      return {
        content,
        reasoner,
        tool_call,
      };
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return {};
    }
  }
}

// 注册Gemini提供商
const GeminiProvider: ModelProvider = {
  name: "Gemini",
  description: "Google Gemini",
  icon: "gemini-color.svg",
  models: {
    "gemini-1.5-pro": {
      name: "gemini-1.5-pro",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 1000000,
      description: "Gemini 1.5 Pro - 强大的多模态理解能力，超长上下文窗口",
    },
    "gemini-1.5-flash": {
      name: "gemini-1.5-flash",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 1000000,
      description: "Gemini 1.5 Flash - 高速版本，适合一般应用场景",
    },
    "gemini-1.0-pro": {
      name: "gemini-1.0-pro",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description: "Gemini 1.0 Pro - 上一代多模态模型",
    },
    "gemini-pro-vision": {
      name: "gemini-pro-vision",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 16000,
      description: "Gemini Pro Vision - 专注图像理解的模型",
    },
  },
  create: (model_name: string) => new Gemini(model_name),
};

// 注册到ChatModel
ModelManager.registerProvider(GeminiProvider);
