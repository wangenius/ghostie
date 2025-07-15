import { Agent } from "./Agent";
import {
  AgentProps,
  ExecuteOptions,
  AgentChatOptions,
} from "@common/types/agent";
import { MemoryMessage } from "@common/types/MessageType";

/* ReAct Agent 子类 */
export class ReactAgent extends Agent {
  constructor(infos: AgentProps) {
    super(infos);
  }

  /* 机器人对话 */
  async chat(
    input: string,
    options?: AgentChatOptions,
  ): Promise<MemoryMessage> {
    return await this.run(input, {
      images: options?.images?.map(
        (img) => `data:${img.contentType};base64,${img.base64Image}`,
      ),
    });
  }

  /* 执行 ReAct 逻辑 */
  async run(input: string, options?: ExecuteOptions): Promise<MemoryMessage> {
    try {
      let content = input;
      let iterations = 0;
      console.log("当前模型:", this.model);

      this.context.pushMessage({
        from: "user",
        content: [
          {
            type: "text",
            content: content,
          },
        ],
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      /* 开始迭代 */
      while (iterations < 20) {
        iterations++;
        let content = "";
        let reasoner = "";

        this.context.addLastMessage({
          from: "agent",
          content: [
            {
              type: "text",
              content: content,
            },
          ],
          created_at: Date.now(),
          updated_at: Date.now(),
        });

        /* 生成响应 */
        const response = await this.model.stream(this.context, (chunk) => {
          content += chunk.completion || "";
          reasoner += chunk.reasoner || "";
          this.context.updateLastMessage({
            content,
            reasoner,
          });
        });

        console.log(response);

        if (response.error) {
          this.context.updateLastMessage({
            error: response.error,
            loading: false,
          });
          break;
        }

        // 更新内容
        if (response.body) {
          this.context.updateLastMessage({
            content: response.body,
          });
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
                // 解析工具调用参数
                const args = JSON.parse(tool.function.arguments || "{}");
                console.log(`执行工具: ${tool.function.name}`, args);

                // 这里应该调用实际的工具执行逻辑
                // 目前先返回一个占位符结果
                const toolResult = `工具 ${tool.function.name} 已被调用，参数: ${JSON.stringify(args)}`;

                this.context.updateLastMessage({
                  content: toolResult,
                  loading: false,
                  tool_loading: false,
                });
              } catch (error) {
                console.error(`工具执行失败: ${tool.function.name}`, error);
                this.context.updateLastMessage({
                  content: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
                  loading: false,
                  tool_loading: false,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
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

        await this.model.stream(this.context, (chunk) => {
          content += chunk.completion || "";
          reasoner += chunk.reasoner || "";
          this.context.updateLastMessage({
            content,
            reasoner,
          });
        });

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
