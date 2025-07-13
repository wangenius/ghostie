import { Agent } from "./Agent";
import {
  AgentInfos,
  ExecuteOptions,
  AgentChatOptions,
} from "@common/types/agent";
import { ToolsHandler } from "../model/chat/ToolsHandler";
import { MessageItem } from "../../common/types/chatModel";

/* ReAct Agent 子类 */
export class ReactAgent extends Agent {
  constructor(infos: AgentInfos) {
    super(infos);
  }

  /* 机器人对话 */
  async chat(input: string, options?: AgentChatOptions): Promise<MessageItem> {
    return await this.execute(input, {
      images: options?.images?.map(
        (img) => `data:${img.contentType};base64,${img.base64Image}`,
      ),
    });
  }

  /* 执行 ReAct 逻辑 */
  async execute(input: string, options?: ExecuteOptions): Promise<MessageItem> {
    try {
      await this.ensureInitialized();
      let content = input;
      let iterations = 0;
      console.log("当前模型:", this.model);
      

      this.context.pushMessage({
        role: "user",
        content: content,
        created_at: Date.now(),
        images: options?.images,
        extra: options?.extra,
      });

      /* 开始迭代 */
      while (iterations < 20) {
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

        console.log(response);

        if (response.error) {
          this.context.updateLastMessage({
            error: response.error,
            loading: false,
          });
          break;
        }

        // 如果没有工具调用，说明对话可以结束
        if (response.tool.length === 0) {
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

              const toolResult = await ToolsHandler.call(tool, this);
              this.context.updateLastMessage({
                tool_loading: false,
                tool_call_id: tool.id,
                loading: false,
                content:
                  typeof toolResult?.result === "string"
                    ? toolResult?.result
                    : JSON.stringify(toolResult?.result),
              });
            }
          }
        }

        // 重置输入为空,让模型基于历史消息继续对话
        input = "";
      }

      // 如果达到最大迭代次数，生成一个说明
      if (iterations >= 20) {
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
      console.error("Chat error:", error);
      this.context.updateLastMessage({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
      throw error;
    }
  }
}
