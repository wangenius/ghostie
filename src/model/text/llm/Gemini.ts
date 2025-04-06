import { ChatModel } from "../ChatModel";
import { ChatModelRequestBody, ToolCallReply } from "@/model/types/chatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Gemini extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(GeminiProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
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
const GeminiProvider: ChatModelProvider = {
  name: "Gemini",
  description: "Google Gemini",
  icon: "gemini-color.svg",
  models: {
    "gemini-2.5-pro-preview-03-25": {
      name: "gemini-2.5-pro-preview-03-25",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 1048576 + 65536,
      description:
        "Gemini 2.5 Pro 是我们最先进的思考型模型，能够推理编码、数学和 STEM 领域的复杂问题，还能使用长上下文分析大型数据集、代码库和文档。",
    },
    "gemini-2.0-flash": {
      name: "gemini-2.0-flash",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 1048576 + 8192,
      description:
        "Gemini 2.0 Flash 提供新一代功能和增强型功能，包括更快的速度、原生工具使用、多模态生成功能，以及 100 万个 token 的上下文窗口。",
    },
    "gemini-2.0-flash-lite": {
      name: "gemini-2.0-flash-lite",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 1048576 + 8192,
      description: "一款 Gemini 2.0 Flash 模型，针对性价比和低延迟进行了优化。",
    },
    "gemini-1.5-flash": {
      name: "gemini-1.5-flash",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 1048576 + 8192,
      description:
        "Gemini 1.5 Flash 是一款快速且多才多艺的多模态模型，可跨多种任务进行扩缩。",
    },
  },
  create: (model_name: string) => new Gemini(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(GeminiProvider);
