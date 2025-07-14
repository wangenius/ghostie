import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelV1 } from "@ai-sdk/provider";
import { processDataStream } from "@ai-sdk/ui-utils";
import { ModelItem } from "@common/types/agent";
import {
  ChatModelResponse,
  CompletionMessage,
  OnChunk,
  ToolCallReply,
} from "@common/types/chatModel";
import { generateText, streamText, Tool } from "ai";
import dotenv from "dotenv";
import { createQwen } from "./provider/qwenProvider";

dotenv.config();

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

  static get(modelItem: ModelItem | undefined): LLM {
    if (!modelItem) {
      return new LLM({
        model: createOpenAI({
          apiKey: "",
        })("gpt-4o-mini"),
      });
    }
    const provider = createQwen({
      apiKey: "sk-f341aea76bfc4c07bef778649db243cd",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
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
    let fullReasoning = "";
    let toolCalls: ToolCallReply[] = [];
    let collectedToolCalls: any[] = [];
    let collectedToolResults: any[] = [];

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

          // 转换为ToolCallReply格式
          const toolCallReply: ToolCallReply = {
            id:
              toolCall.toolCallId ||
              toolCall.id ||
              `call_${collectedToolCalls.length - 1}`,
            type: "function" as const,
            index: collectedToolCalls.length - 1,
            function: {
              name: toolCall.toolName || toolCall.name,
              arguments: JSON.stringify(toolCall.args || {}),
            },
          };

          toolCalls.push(toolCallReply);

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
