import { MemoryMessage, OnChunk } from "@common/types/MessageType";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelV1 } from "@ai-sdk/provider";
import { processDataStream } from "@ai-sdk/ui-utils";
import { ModelItem } from "@common/types/agent";
import { CoreMessage, generateText, streamText, Tool, ToolCallPart } from "ai";
import dotenv from "dotenv";
import { createQwen } from "./provider/qwenProvider";
import { Context } from "@/agent/Context";
import { ProviderManager } from "../../store/ProviderManager";

dotenv.config();

/**
 * 简化的 LLM 类，基于 Vercel AI SDK
 * 传入 MemoryMessage， 输出 MemoryMessage 的结构和子结构。
 * 封装 MemoryMessage 到 CoreMessage 之间的转换逻辑。
 */
export class LLM {
  private model: LanguageModelV1;
  private temperature: number = 0.7;
  private tools?: Record<string, Tool>;
  private abortController?: AbortController;

  constructor(config: { model: LanguageModelV1 }) {
    this.model = config.model;
  }

  static get(modelItem: ModelItem | undefined): LLM {
    if (!modelItem) {
      // 默认使用 OpenAI 的 gpt-4o-mini 模型
      return new LLM({
        model: createOpenAI({
          apiKey: "",
        })("gpt-4o-mini"),
      });
    }
    
    try {
      // 使用 ProviderManager 创建模型实例
      const providerManager = ProviderManager.getInstance();
      const model = providerManager.createLanguageModel(modelItem.provider, modelItem.name);
      return new LLM({ model });
    } catch (error) {
      console.error(`创建模型实例失败 (${modelItem.provider}/${modelItem.name}):`, error);
      // 回退到默认模型
      return new LLM({
        model: createOpenAI({
          apiKey: "",
        })("gpt-4o-mini"),
      });
    }
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
  private convertMessages(messages: MemoryMessage[]): CoreMessage[] {
    return messages.map((msg) => {
      const result: Record<string, any> = {
        role:
          msg.from === "user"
            ? "user"
            : msg.from === "agent"
              ? "assistant"
              : "system",
      };

      if (msg.from === "system") {
        result.content = msg.content;
      } else if (msg.from === "user") {
        // 处理用户消息内容数组
        const textContent = msg.content
          .filter((item) => item.type === "text")
          .map((item) => item.content)
          .join("\n");
        result.content = textContent;
      } else if (msg.from === "agent") {
        // 处理代理消息内容数组
        const textContent = msg.content
          .filter((item) => item.type === "text")
          .map((item) => item.content)
          .join("\n");
        result.content = textContent;
      }

      return result as CoreMessage;
    });
  }

  /** 流式生成
   * @param context 上下文对象
   * @param onChunk 数据块处理回调
   * @returns 流式生成结果
   */
  public async stream(
    context: Context,
    onChunk?: (chunk: OnChunk) => void,
  ): Promise<{
    body?: string;
    error?: string;
    tool: ToolCallPart[];
    stop: () => Promise<void>;
  }> {
    await this.stop(); // 停止之前的请求
    this.abortController = new AbortController();

    let completionContent = "";
    let fullReasoning = "";
    let toolCalls: ToolCallPart[] = [];
    let collectedToolCalls: any[] = [];
    let collectedToolResults: any[] = [];

    try {
      const coreMessages = this.convertMessages(context.getMessages());
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

      const result = streamText({
        model: this.model,
        messages: coreMessages,
        temperature: this.temperature,
        tools: this.tools,
        maxSteps: 5,
        abortSignal: this.abortController.signal,
        onError: (error) => {
          console.error("流式处理错误:", error);
        },
      });

      console.log("streamText result created, starting to process stream...");

      // 使用 processDataStream 进行更精确的流控制
      await processDataStream({
        stream: result.toDataStream({
          sendReasoning: true,
          sendSources: true,
          sendUsage: true,
        }),
        onTextPart: async (textPart: string) => {
          if (this.abortController?.signal.aborted) return;

          console.log("收到文本片段:", textPart);
          completionContent += textPart;
          onChunk?.({
            completion: textPart,
            reasoner: undefined,
          });
        },
        onReasoningPart: async (reasoningPart: string) => {
          if (this.abortController?.signal.aborted) return;

          console.log("收到推理片段:", reasoningPart);
          fullReasoning += reasoningPart;

          onChunk?.({
            completion: "",
            reasoner: reasoningPart,
          });
        },
        onToolCallPart: async (toolCall: any) => {
          if (this.abortController?.signal.aborted) return;
          console.log("收到工具调用:", toolCall);
          collectedToolCalls.push(toolCall);
          toolCalls.push(toolCall);
          onChunk?.({
            completion: "",
            reasoner: undefined,
          });
        },
        onToolResultPart: async (toolResult: any) => {
          if (this.abortController?.signal.aborted) return;

          console.log("收到工具结果:", toolResult);
          collectedToolResults.push(toolResult);

          onChunk?.({
            completion: "",
            reasoner: undefined,
          });
        },
        onErrorPart: async (error: any) => {
          console.error("流处理错误:", error);
          onChunk?.({
            completion: "",
            reasoner: undefined,
          });
        },
        onFinishStepPart: async (stepData: any) => {
          console.log("步骤完成:", stepData);
        },
        onFinishMessagePart: async (finishData: any) => {
          console.log("消息完成:", finishData);
        },
        onStartStepPart: async (stepStart: any) => {
          console.log("步骤开始:", stepStart);
        },
        onDataPart: async (dataPart: any) => {
          console.log("收到数据片段:", dataPart);
        },
      });

      console.log(
        "Stream processing completed, final content:",
        completionContent,
      );
      console.log(`收集到的工具调用数量: ${collectedToolCalls.length}`);
      console.log(`收集到的工具结果数量: ${collectedToolResults.length}`);

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
  public async json(messages: MemoryMessage[]): Promise<any> {
    const text = await this.generate(messages);
    return JSON.parse(text);
  }

  /**
   * 简单的文本生成
   */
  public async generate(messages: MemoryMessage[]): Promise<string> {
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
