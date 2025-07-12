/** Chat模型 */
import { ModelItem } from "@/agent/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  CompletionMessage,
  ToolCallReply,
  ToolRequestBody,
} from "@common/types/chatModel";
import { gen } from "@/utils/generator";
import { ChatModelManager } from "./ChatModelManager";
import { HttpStreamHandler } from "@/utils/http-stream";

interface ChatModelInfo {
  model: string;
  api_key: string;
  api_url: string;
}

type OnChunk = (chunk: { completion?: string; reasoner?: string }) => void;

/** Chat模型, 用于与模型进行交互
 *
 */
export class ChatModel {
  /** 模型信息 */
  public info: ChatModelInfo;
  /** 工具 */
  protected tools?: ToolRequestBody;
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 0.7;
  /** HTTP流处理器 */
  private httpHandler: HttpStreamHandler;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: ChatModelInfo) {
    this.info = config;
    this.httpHandler = new HttpStreamHandler();
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:gpt-4
   * @returns 模型实例
   */
  static create(model?: ModelItem) {
    if (model?.provider) {
      return ChatModelManager.get(model.provider).create(model.name);
    }
    return new ChatModel({
      api_key: "",
      api_url: "",
      model: "",
    });
  }

  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  setTools(tools: ToolRequestBody): this {
    if (tools.length > 0) {
      this.tools = tools;
    }
    return this;
  }

  addTools(tools: ToolRequestBody): this {
    if (this.tools) {
      this.tools = [...this.tools, ...tools];
    } else {
      this.tools = tools;
    }
    return this;
  }

  /**
   * 请求体适配器,允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected RequestBodyAdapter(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 默认实现直接返回原始请求体
    return body;
  }

  /**
   * 解析响应体，处理不同提供商的响应格式差异
   * @param payload 原始响应数据字符串
   * @returns 解析后的内容、推理和工具调用
   */
  protected ResponseBodyAdapter(payload: string): {
    completion?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      const data = JSON.parse(payload);
      
      let completion = "";
      let reasoner = "";
      let tool_call: ToolCallReply | undefined;

      // 标准 OpenAI 格式
      if (data.choices && data.choices[0]) {
        const choice = data.choices[0];
        
        // 处理文本内容
        if (choice.delta?.content) {
          completion = choice.delta.content;
        }
        
        // 处理工具调用
        if (choice.delta?.tool_calls && choice.delta.tool_calls[0]) {
          const toolCall = choice.delta.tool_calls[0];
          tool_call = {
            id: toolCall.id,
            type: toolCall.type,
            index: toolCall.index || 0,
            function: {
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || "",
            },
          };
        }
      }

      return {
        completion,
        reasoner,
        tool_call,
      };
    } catch (error) {
      console.error("解析响应失败:", error);
      return {};
    }
  }

  /**
   * 工具调用适配器，处理工具调用的解析和合并
   * @param rawToolCalls 收集到的原始工具调用数组
   * @returns 处理后的工具调用数组
   */
  protected ToolCallAdapter(rawToolCalls: ToolCallReply[]): ToolCallReply[] {
    // 合并相同ID的工具调用
    const toolCallMap = new Map<string, ToolCallReply>();
    
    for (const toolCall of rawToolCalls) {
      if (toolCall?.id) {
        const existing = toolCallMap.get(toolCall.id);
        if (existing) {
          // 合并arguments
          existing.function.arguments += toolCall.function.arguments;
        } else {
          toolCallMap.set(toolCall.id, { ...toolCall });
        }
      }
    }
    
    return Array.from(toolCallMap.values());
  }

  /** 流式生成
   * @param prompt 提示词，如果为空，则使用历史消息，因为可能存在assistant的消息
   * @returns 流式生成结果
   */
  public async stream(
    message: CompletionMessage[],
    onChunk?: OnChunk,
  ): Promise<ChatModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 消息 */
    let messages: CompletionMessage[] = message;
    /* 工具调用收集 */
    let rawToolCalls: ToolCallReply[] = [];
    let completionContent = "";

    try {
      /* 创建请求体 */
      let requestBody: ChatModelRequestBody = {
        model: this.info.model,
        messages,
        stream: true,
        temperature: this.temperature,
        tools: this.tools,
      };

      /* 适配子类请求体 */
      requestBody = this.RequestBodyAdapter(requestBody);

      console.log("requestBody", requestBody);

      // 发起流式请求
      await this.httpHandler.streamRequest(
        this.info.api_url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.info.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        (chunk: string) => {
          /* 适配子类不同的响应格式 */
          const parsedChunk = this.ResponseBodyAdapter(chunk);

          /* 内容 */
          if (parsedChunk.completion) {
            completionContent += parsedChunk.completion;
            onChunk?.({ 
              completion: parsedChunk.completion, 
              reasoner: parsedChunk.reasoner 
            });
          }

          /* 收集工具调用 */
          if (parsedChunk.tool_call) {
            rawToolCalls.push(parsedChunk.tool_call);
          }
        },
        (error: Error) => {
          throw error;
        }
      );

      // 直接处理所有收集到的工具调用
      const tool_calls = this.ToolCallAdapter(rawToolCalls);

      return {
        body: completionContent,
        stop: () => this.stop(),
        tool: tool_calls,
      };
    } catch (error) {
      this.currentRequestId = undefined;
      return {
        body: completionContent,
        error: String(error),
        stop: () => this.stop(),
        tool: rawToolCalls,
      };
    }
  }

  /** 停止生成 */
  public async stop(): Promise<void> {
    if (this.currentRequestId) {
      this.httpHandler.abort();
      this.currentRequestId = undefined;
    }
  }

  /**
   * 以 JSON 结构输出内容并自动解析
   * @param message 历史消息
   * @returns Promise<any> 最终解析到的 JSON 对象
   */
  public async json(messages: CompletionMessage[]): Promise<any> {
    const requestBody = {
      model: this.info.model,
      messages,
      temperature: this.temperature,
      tools: this.tools,
    };

    try {
      const result = await this.httpHandler.request(
        this.info.api_url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.info.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      // 提取响应内容
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const content = result.choices[0].message.content;
        return JSON.parse(content);
      }
      
      throw new Error("无法从响应中提取内容");
    } catch (e) {
      throw new Error("模型输出无法解析为 JSON: " + e);
    }
  }
}
