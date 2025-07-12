import { generateText, streamText, CoreMessage, CoreTool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { gen } from "@/utils/generator";
import {
  CompletionMessage,
  ToolCallReply,
  ChatModelResponse,
  OnChunk,
} from "../../../common/types/chatModel";

/**
 * 基于 Vercel AI SDK 的 ChatModel 类
 * 支持多个模型提供商和统一的流式处理
 */
export class AISdkChatModel {
  /** 模型配置 */
  protected config: {
    provider: string;
    model: string;
    apiKey: string;
    baseURL?: string;
  };

  /** 温度 */
  protected temperature: number = 0.7;

  /** 工具 */
  protected tools?: Record<string, CoreTool>;

  /** 当前请求ID */
  protected currentRequestId?: string;

  /** 中止控制器 */
  private abortController?: AbortController;

  constructor(config: {
    provider: string;
    model: string;
    apiKey: string;
    baseURL?: string;
  }) {
    this.config = config;
  }

  /** 创建模型实例 */
  static create(config: {
    provider: string;
    model: string;
    apiKey: string;
    baseURL?: string;
  }): AISdkChatModel {
    return new AISdkChatModel(config);
  }

  /** 设置温度 */
  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  /** 设置工具 */
  setTools(tools: Record<string, CoreTool>): this {
    this.tools = tools;
    return this;
  }

  /** 获取模型配置 */
  getConfig() {
    return this.config;
  }

  /** 停止当前请求 */
  async stop(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
    this.currentRequestId = undefined;
  }

  /**
   * 获取AI SDK模型实例
   */
  private getAIModel() {
    const { provider, model, apiKey, baseURL } = this.config;

    switch (provider.toLowerCase()) {
      case "openai":
        const openai = createOpenAI({
          apiKey,
          baseURL,
        });
        return openai(model);
      case "anthropic":
      case "claude":
        const anthropic = createAnthropic({
          apiKey,
          baseURL,
        });
        return anthropic(model);

      default:
        // 对于其他提供商，使用OpenAI兼容格式
        const compatibleProvider = createOpenAI({
          apiKey,
          baseURL: baseURL || this.getDefaultBaseURL(provider),
        });
        return compatibleProvider(model);
    }
  }

  /**
   * 获取提供商的默认baseURL
   */
  private getDefaultBaseURL(provider: string): string {
    // 根据提供商返回相应的baseURL
    switch (provider.toLowerCase()) {
      case "openai":
        return "https://api.openai.com/v1";
      case "anthropic":
      case "claude":
        return "https://api.anthropic.com/v1";
      case "deepseek":
        return "https://api.deepseek.com";
      case "moonshot":
        return "https://api.moonshot.cn/v1";
      case "zhipu":
        return "https://open.bigmodel.cn/api/paas/v4";
      case "tongyi":
      case "通义千问":
        return "https://dashscope.aliyuncs.com/compatible-mode/v1";
      case "doubao":
        return "https://ark.cn-beijing.volces.com/api/v3";
      case "hunyuan":
        return "https://api.hunyuan.cloud.tencent.com/v1";
      case "siliconflow":
        return "https://api.siliconflow.cn/v1";
      case "openrouter":
        return "https://openrouter.ai/api/v1";
      case "deerapi":
        return "https://api.deerapi.com/v1";
      case "jina":
        return "https://deepsearch.jina.ai/v1";
      case "gemini":
        return "https://generativelanguage.googleapis.com/v1beta/openai";
      default:
        // 对于未知提供商，使用通用格式（但避免中文字符）
        console.warn(`未知提供商: ${provider}，使用默认 baseURL`);
        return "https://api.openai.com/v1";
    }
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: CompletionMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { toolInvocations: msg.tool_calls }),
      ...(msg.tool_call_id && { toolCallId: msg.tool_call_id }),
    }));
  }

  /**
   * 转换工具调用结果
   */
  private convertToolCalls(toolCalls: any[]): ToolCallReply[] {
    return toolCalls.map((call, index) => ({
      id: call.toolCallId,
      type: "function" as const,
      index,
      function: {
        name: call.toolName,
        arguments: JSON.stringify(call.args),
      },
    }));
  }

  /** 流式生成
   * @param messages 消息列表
   * @param onChunk 数据块处理回调
   * @returns 流式生成结果
   */
  public async stream(
    messages: CompletionMessage[],
    onChunk?: (chunk: OnChunk) => void,
  ): Promise<ChatModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    // 生成请求ID
    this.currentRequestId = gen.id();
    this.abortController = new AbortController();

    let completionContent = "";
    let toolCalls: ToolCallReply[] = [];

    try {
      // 检查API密钥
      if (!this.config.apiKey || this.config.apiKey.trim() === "") {
        const errorMessage = `API密钥未设置或为空，提供商: ${this.config.provider}`;
        console.error(errorMessage);
        return {
          body: "",
          error: errorMessage,
          stop: () => this.stop(),
          tool: toolCalls,
        };
      }

      const aiModel = this.getAIModel();
      const coreMessages = this.convertMessages(messages);

      console.log("AI SDK 请求:", {
        config: this.config,
        model: this.config.model,
        provider: this.config.provider,
        baseURL: this.config.baseURL,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
        hasApiKey: !!this.config.apiKey,
      });

      const result = await streamText({
        model: aiModel,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
        abortSignal: this.abortController.signal,
      });

      // 处理流式响应
      for await (const delta of result.textStream) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        completionContent += delta;

        // 调用回调函数
        if (onChunk) {
          onChunk({
            completion: delta,
            reasoner: undefined, // AI SDK 暂不支持推理内容
          });
        }
      }

      // 等待完成并获取工具调用
      const finalResult = await result.finishReason;
      if (result.toolCalls) {
        toolCalls = this.convertToolCalls(await result.toolCalls);
      }

      return {
        body: completionContent,
        stop: () => this.stop(),
        tool: toolCalls,
      };
    } catch (error) {
      this.currentRequestId = undefined;

      if (error instanceof Error && error.name === "AbortError") {
        return {
          body: completionContent,
          stop: () => this.stop(),
          tool: toolCalls,
        };
      }

      // 详细的错误处理
      let errorMessage = "";
      if (error instanceof Error) {
        errorMessage = error.message;

        // 特殊错误处理
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage = `API密钥无效或已过期，提供商: ${this.config.provider}`;
        } else if (
          error.message.includes("403") ||
          error.message.includes("Forbidden")
        ) {
          errorMessage = `API访问被拒绝，请检查API密钥权限，提供商: ${this.config.provider}`;
        } else if (
          error.message.includes("429") ||
          error.message.includes("Too Many Requests")
        ) {
          errorMessage = `API调用频率过高，请稍后再试，提供商: ${this.config.provider}`;
        } else if (
          error.message.includes("500") ||
          error.message.includes("Internal Server Error")
        ) {
          errorMessage = `服务器内部错误，提供商: ${this.config.provider}`;
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = `网络连接错误，请检查网络连接，提供商: ${this.config.provider}`;
        }
      } else {
        errorMessage = String(error);
      }

      console.error("AI SDK 流式生成错误:", {
        provider: this.config.provider,
        model: this.config.model,
        baseURL: this.config.baseURL,
        error: errorMessage,
        originalError: error,
      });

      return {
        body: completionContent,
        error: errorMessage,
        stop: () => this.stop(),
        tool: toolCalls,
      };
    }
  }

  /**
   * 非流式生成（用于JSON格式输出）
   * @param messages 消息列表
   * @returns Promise<any> 解析后的JSON对象
   */
  public async json(messages: CompletionMessage[]): Promise<any> {
    try {
      const aiModel = this.getAIModel();
      const coreMessages = this.convertMessages(messages);

      const result = await generateText({
        model: aiModel,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
      });

      // 尝试解析为JSON
      return JSON.parse(result.text);
    } catch (error) {
      throw new Error(`模型输出无法解析为 JSON: ${error}`);
    }
  }

  /**
   * 简单的文本生成
   * @param messages 消息列表
   * @returns Promise<string> 生成的文本
   */
  public async generate(messages: CompletionMessage[]): Promise<string> {
    try {
      const aiModel = this.getAIModel();
      const coreMessages = this.convertMessages(messages);

      const result = await generateText({
        model: aiModel,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
      });

      return result.text;
    } catch (error) {
      throw new Error(`文本生成失败: ${error}`);
    }
  }
}
