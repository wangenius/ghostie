import { Agent } from "@/agent/Agent";
import { ExecuteOptions } from "@/agent/types/agent";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";
import { MessageItem } from "@/model/types/chatModel";
/* ReAct 引擎 */
export class ReAct extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string, options?: ExecuteOptions): Promise<MessageItem> {
    try {
      await this.ensureInitialized();

      let content = input;

      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();
      /* 添加用户消息 */
      this.context.runtime.push({
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
        this.context.runtime.addLastMessage({
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
            this.context.runtime.updateLastMessage({
              content,
              reasoner,
            });
          },
        );

        console.log(response);

        if (response.error) {
          console.error(response.error);
          this.context.runtime.updateLastMessage({
            error: response.error,
            loading: false,
          });
          break;
        }
        // 如果没有工具调用，说明对话可以结束
        if (response.tool.length === 0) {
          this.context.runtime.updateLastMessage({
            loading: false,
          });
          break;
        } else {
          this.context.runtime.updateLastMessage({
            tool_calls: response.tool.filter((tool) => tool?.id),
            tool_loading: false,
            loading: false,
          });
          for (const tool of response.tool) {
            if (tool?.id) {
              this.context.runtime.addLastMessage({
                role: "tool",
                content: "",
                tool_call_id: tool.id,
                created_at: Date.now(),
                loading: true,
                tool_loading: true,
              });
              const toolResult = await ToolsHandler.call(tool, this.agent);
              this.context.runtime.updateLastMessage({
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
      if (iterations >= MAX_ITERATIONS) {
        this.context.runtime.push({
          role: "user",
          content: "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
          created_at: Date.now(),
          hidden: true,
        });
        let content = "";
        let reasoner = "";
        this.context.runtime.addLastMessage({
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
            this.context.runtime.updateLastMessage({
              content,
              reasoner,
            });
          },
        );
        this.context.runtime.updateLastMessage({
          loading: false,
        });
      }

      return this.context.runtime.getLastMessage();
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }
}

// 注册 ReAct
EngineManager.register("react", {
  name: "ReAct",
  description:
    "ReAct 是一种基于反应的对话模式，它允许模型在对话中生成反应，并根据反应执行工具调用。",
  create: (agent: Agent) => new ReAct(agent),
});
