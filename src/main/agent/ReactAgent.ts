import {
  AgentProps
} from "@common/types/agent";
import { MemoryMessage } from "@common/types/MessageType";
import { Agent } from "./Agent";

/* ReAct Agent 子类 */
export class ReactAgent extends Agent {
  constructor(infos: AgentProps) {
    super(infos);
  }

  /* 机器人对话 */
  async chat(
    input: string,
  ): Promise<MemoryMessage> {
    return await this.run(input);
  }

  /* 执行 ReAct 逻辑 */
  async run(input: string): Promise<MemoryMessage> {
    try {
      let content = input;
      let iterations = 0;
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
          content: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        });

        /* 生成响应 */
        const response = await this.model.stream(this.context, (chunk) => {
          content += chunk.completion || "";
          reasoner += chunk.reasoner || "";
          if (chunk.completion) {
            this.context.updateLastMessage({
              type: "text",
              content: chunk.completion,
            });
          }
          if (chunk.reasoner) {
            this.context.updateLastMessage({
              type: "reasoning",
              content: chunk.reasoner,
            });
          }
        });

        console.log(response);

        if (response.error) {
          this.context.updateLastMessage({
            type: "text",
            content: `错误: ${response.error}`,
          });
          break;
        }

        // 流式处理已经通过chunk回调更新了内容，这里不需要再次更新

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool || response.tool.length === 0) {
          break;
        } else {
          // 执行工具调用
          for (const tool of response.tool) {
            const { toolCallId, toolName, args } = tool;
            if (toolCallId && toolName) {
              // 追加工具调用内容
              this.context.updateLastMessage({
                type: "tool-call",
                content: {
                  toolCallId,
                  toolName,
                  args,
                },
              });

              // 工具执行结果
              try {
                const parsedArgs =
                  typeof args === "string" ? JSON.parse(args) : args;
                console.log(`执行工具: ${toolName}`, parsedArgs);
                // 这里应该调用实际的工具执行逻辑
                // 目前先返回一个占位符结果
                const toolResult = `工具 ${toolName} 已被调用，参数: ${JSON.stringify(parsedArgs)}`;
                this.context.updateLastMessage({
                  type: "tool-result",
                  content: {
                    toolCallId,
                    result: toolResult,
                  },
                });
              } catch (error) {
                console.error(`工具执行失败: ${toolName}`, error);
                this.context.updateLastMessage({
                  type: "tool-result",
                  content: {
                    toolCallId,
                    result: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
                  },
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
          from: "user",
          content: [
            {
              type: "text",
              content: "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
            },
          ],
          created_at: Date.now(),
          updated_at: Date.now(),
        });

        let content = "";
        let reasoner = "";

        this.context.addLastMessage({
          from: "agent",
          content: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        });

        await this.model.stream(this.context, (chunk) => {
          content += chunk.completion || "";
          reasoner += chunk.reasoner || "";
          if (chunk.completion) {
            this.context.updateLastMessage({
              type: "text",
              content: chunk.completion,
            });
          }
          if (chunk.reasoner) {
            this.context.updateLastMessage({
              type: "reasoning",
              content: chunk.reasoner,
            });
          }
        });
      }

      return this.context.getLastMessage();
    } catch (error) {
      console.error("Chat error:", error);
      this.context.updateLastMessage({
        type: "text",
        content: `错误: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }
  }
}
