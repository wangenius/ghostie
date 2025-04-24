import { Agent } from "@/agent/Agent";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { SettingsManager } from "@/settings/SettingsManager";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";
/* ReAct 引擎 */
export class ReAct extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string, props?: { images?: string[]; extra?: string }) {
    try {
      await this.ensureInitialized();

      let content = input;

      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();
      // 思考和行动阶段：让模型生成响应和可能的工具调用
      this.context.setSystem(this.agent.props.system);
      this.context.runtime.push({
        role: "user",
        content: content,
        created_at: Date.now(),
        images: props?.images,
        extra: props?.extra,
      });
      while (iterations < MAX_ITERATIONS) {
        iterations++;
        let content = "";
        let reasoner = "";
        this.context.runtime.addLastMessage({
          role: "assistant",
          content: "",
          created_at: Date.now(),
        });
        const response = await this.model.stream(
          this.context.getCompletionMessages(),
          (chunk) => {
            content += chunk.completion || "";
            reasoner += chunk.reasoner || "";
            if (chunk.completion) {
              this.context.runtime.updateLastMessage({
                content,
                reasoner,
              });
            }
          },
          (tool) => {
            if (tool.tool_call) {
              ToolsHandler.call(tool.tool_call, this.agent);
            }
          },
        );

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool) {
          break;
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
        });
        let content = "";
        let reasoner = "";
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
