import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelV1, ProviderV1 } from "@ai-sdk/provider";
import { ModelItem } from "@common/types/agent";
import {
  ChatModelResponse,
  CompletionMessage,
  OnChunk,
  ToolCallReply,
} from "@common/types/chatModel";
import { generateText, Tool } from "ai";
import { createQwen } from "./provider/qwenProvider";

export const Providers = new Map<string, ProviderV1>();

// 初始化默认providers
function initializeDefaultProviders() {
  // 注册默认的OpenAI provider
  Providers.set(
    "openai",
    createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  );

  // 注册默认的Anthropic provider
  Providers.set(
    "anthropic",
    createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  );

  // 注册默认的Qwen provider
  Providers.set(
    "qwen",
    createQwen({
      apiKey: process.env.DASHSCOPE_API_KEY,
    }),
  );

  console.log("已初始化默认providers:", Array.from(Providers.keys()));
}

// 立即初始化默认providers
initializeDefaultProviders();
/**
 * 简化的 LLM 类，基于 Vercel AI SDK
 */
export class LLM {
  private model: LanguageModelV1;
  private temperature: number = 0.7;
  private tools?: Record<string, Tool>;
  private abortController?: AbortController;

  constructor(config: { model: LanguageModelV1 }) {
    this.model = config.model;
  }

  static getProvider(providerName: string): ProviderV1 | undefined {
    return Providers.get(providerName);
  }

  static get(modelItem: ModelItem | undefined): LLM {
    if (!modelItem) {
      return new LLM({
        model: createOpenAI({
          apiKey: "",
        })("gpt-4o-mini"),
      });
    }
    const provider = LLM.getProvider(modelItem.provider);
    if (!provider) {
      throw new Error(`Provider ${modelItem.provider} not found`);
    }
    return new LLM({
      model: provider.languageModel(modelItem.name),
    });
  }

  /** 设置温度 */
  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  /** 设置工具 */
  setTools(tools: Record<string, Tool>): this {
    this.tools = tools;
    return this;
  }

  /** 停止当前请求 */
  async stop(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: CompletionMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 转换工具调用结果
   */
  private convertToolCalls(toolCalls: any[]): ToolCallReply[] {
    return toolCalls.map((call, index) => ({
      id: call.toolCallId || `call_${index}`,
      type: "function" as const,
      index,
      function: {
        name: call.toolName,
        arguments: JSON.stringify(call.args || {}),
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
    await this.stop(); // 停止之前的请求
    this.abortController = new AbortController();

    let completionContent = "";
    let toolCalls: ToolCallReply[] = [];

    try {
      const coreMessages = this.convertMessages(messages);
      console.log(
        "baseArgs",
        JSON.stringify(
          {
            model: this.model.modelId,
            temperature: this.temperature,
            messages: coreMessages,
          },
          null,
          2,
        ),
      );

      const result = await generateText({
        model: this.model,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
        abortSignal: this.abortController.signal,
      });

      console.log("streamText result created, starting to process stream...");

      // 处理流式响应
      for await (const delta of result.text) {
        if (this.abortController?.signal.aborted) break;

        console.log("Received delta:", delta);
        completionContent += delta;
        onChunk?.({
          completion: delta,
          reasoner: undefined,
        });
      }

      console.log(
        "Stream processing completed, final content:",
        completionContent,
      );

      // 获取工具调用
      if (result.toolCalls) {
        toolCalls = this.convertToolCalls(await result.toolCalls);
        console.log("Tool calls:", toolCalls);
      }

      return {
        body: completionContent,
        stop: () => this.stop(),
        tool: toolCalls,
      };
    } catch (error) {
      console.error("Stream error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
   */
  public async json(messages: CompletionMessage[]): Promise<any> {
    const text = await this.generate(messages);
    return JSON.parse(text);
  }

  /**
   * 简单的文本生成
   */
  public async generate(messages: CompletionMessage[]): Promise<string> {
    const coreMessages = this.convertMessages(messages);

    const result = await generateText({
      model: this.model,
      messages: coreMessages,
      temperature: this.temperature,
      tools: this.tools,
    });

    return result.text;
  }
}
