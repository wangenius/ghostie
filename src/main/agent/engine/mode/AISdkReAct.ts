import { Agent } from "@/agent/Agent";
import { ExecuteOptions } from "@/agent/types/agent";
import { ChatModel } from "@/model/chat/ChatModel";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { MessageItem } from "@/model/types/chatModel";
import { SettingsManager } from "@/user/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";

/* 使用 AI SDK 的 ReAct 引擎 */
export class AISdkReAct extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string, options?: ExecuteOptions): Promise<MessageItem> {
    try {
      await this.ensureInitialized();

      // 确保使用的是 AI SDK 模型
      if (!(this.model instanceof ChatModel)) {
        throw new Error('AISdkReAct 引擎需要使用 AISdkChatModel');
      }

      let content = input;
      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();
      
      this.context.pushMessage({
        role: "user",
        content: content,
        created_at: Date.now(),
        images: options?.images,
        extra: options?.extra,
      });

      /* 开始迭代 */
      while (iterations < MAX_ITERATIONS) {
        iterations++;
        let content = "";
        let reasoner = "";
        
        this.context.addLastMessage({
          role: "assistant",
          content: content,
          reasoner: reasoner,
          created_at: Date.now(),
          loading: true,
        });

        /* 生成响应 */
        const response = await this.model.stream(
          this.context.getCompletionMessages().slice(0, -1),
          (chunk) => {
            content += chunk.completion || "";
            reasoner += chunk.reasoner || "";
            this.context.updateLastMessage({
              content,
              reasoner,
            });
          },
        );

        console.log('AI SDK Response:', response);

        if (response.error) {
          this.context.updateLastMessage({
            error: response.error,
            loading: false,
          });
          break;
        }

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool || response.tool.length === 0) {
          this.context.updateLastMessage({
            loading: false,
          });
          break;
        } else {
          this.context.updateLastMessage({
            tool_calls: response.tool.filter((tool) => tool?.id),
            tool_loading: false,
            loading: false,
          });

          // 执行工具调用
          for (const tool of response.tool) {
            if (tool?.id) {
              this.context.addLastMessage({
                role: "tool",
                content: "",
                tool_call_id: tool.id,
                created_at: Date.now(),
                loading: true,
                tool_loading: true,
              });

              try {
                const toolResult = await ToolsHandler.call(tool, this.agent);
                this.context.updateLastMessage({
                  tool_loading: false,
                  tool_call_id: tool.id,
                  loading: false,
                  content:
                    typeof toolResult?.result === "string"
                      ? toolResult?.result
                      : JSON.stringify(toolResult?.result),
                });
              } catch (toolError) {
                this.context.updateLastMessage({
                  tool_loading: false,
                  tool_call_id: tool.id,
                  loading: false,
                  content: `工具调用失败: ${toolError}`,
                });
              }
            }
          }
        }

        // 重置输入为空,让模型基于历史消息继续对话
        input = "";
      }

      // 如果达到最大迭代次数，生成一个说明
      if (iterations >= MAX_ITERATIONS) {
        this.context.pushMessage({
          role: "user",
          content: "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
          created_at: Date.now(),
          hidden: true,
        });
        
        let content = "";
        let reasoner = "";
        
        this.context.addLastMessage({
          role: "assistant",
          content: "",
          created_at: Date.now(),
          loading: true,
        });

        await this.model.stream(
          this.context.getCompletionMessages(),
          (chunk) => {
            content += chunk.completion || "";
            reasoner += chunk.reasoner || "";
            this.context.updateLastMessage({
              content,
              reasoner,
            });
          },
        );

        this.context.updateLastMessage({
          loading: false,
        });
      }

      return this.context.getLastMessage();
    } catch (error) {
      console.error("AI SDK Chat error:", error);
      this.context.updateLastMessage({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
      throw error;
    }
  }
}

// 注册 AI SDK ReAct 引擎
EngineManager.register("ai-sdk-react", {
  name: "AI SDK ReAct",
  description:
    "使用 AI SDK 的 ReAct 引擎，提供更好的流式响应和工具调用支持。",
  create: (agent: Agent) => new AISdkReAct(agent),
}); 