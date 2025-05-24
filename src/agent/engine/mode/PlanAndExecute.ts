import { Agent } from "@/agent/Agent";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { Engine } from "../Engine";
import { EngineManager } from "../EngineManager";
import { ChatModel } from "@/model/chat/ChatModel";
import { CompletionMessage } from "@/model/types/chatModel";

export class PlanAndExecute extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string) {
    try {
      await this.ensureInitialized();
      this.context.reset();
      // 独立的 ChatModel 用于规划和每一步结构化执行
      const plannerModel = ChatModel.create(this.agent.infos.models?.text);
      plannerModel.setTemperature(this.agent.infos.configs?.temperature || 1);
      // 用本地数组维护 plannerModel 的消息历史
      const plannerMessages: CompletionMessage[] = [];
      // 1. 生成结构化计划（不污染主对话）
      plannerMessages.push({
        role: "user",
        content: `请将用户输入\"${input}\"分解为结构化任务计划。`,
      });
      const plan = await plannerModel.json(plannerMessages);
      if (!plan.steps || !Array.isArray(plan.steps))
        throw new Error("计划生成失败");

      // 主对话流记录用户输入
      this.context.pushMessage({
        role: "user",
        content: input,
        created_at: Date.now(),
      });

      // 2. 逐步执行计划
      const MAX_RETRY = 3;
      for (const step of plan.steps) {
        let success = false;
        let retryCount = 0;
        while (!success && retryCount < MAX_RETRY) {
          // 用 plannerModel 执行每一步
          plannerMessages.push({
            role: "user",
            content: `请严格按照JSON格式执行第${step.index}步：\"${step.desc}\"`,
          });
          let stepResult = null;
          let toolResult = null;
          // 主对话结构化记录 assistant 响应
          this.context.addLastMessage({
            role: "assistant",
            content: "",
            created_at: Date.now(),
            loading: true,
          });
          // 获取模型响应（结构化）
          stepResult = await plannerModel.json(plannerMessages);
          this.context.updateLastMessage({
            content: JSON.stringify(stepResult),
            loading: false,
          });
          // 工具调用
          if (stepResult.tool_call && stepResult.tool_call.name) {
            this.context.addLastMessage({
              role: "tool",
              content: "",
              tool_call_id: stepResult.tool_call.id,
              created_at: Date.now(),
              loading: true,
              tool_loading: true,
            });
            toolResult = await ToolsHandler.call(
              stepResult.tool_call,
              this.agent,
            );
            this.context.updateLastMessage({
              tool_loading: false,
              tool_call_id: stepResult.tool_call.id,
              loading: false,
              content:
                typeof toolResult?.result === "string"
                  ? toolResult?.result
                  : JSON.stringify(toolResult?.result),
            });
          }
          // 判断执行结果
          if (
            (toolResult && toolResult.result && toolResult.result.error) ||
            (stepResult && stepResult.error)
          ) {
            retryCount++;
            if (retryCount >= MAX_RETRY) {
              this.context.addLastMessage({
                role: "assistant",
                content: `第${step.index}步执行失败，已跳过。错误信息：${toolResult?.result?.error || stepResult?.error}`,
                created_at: Date.now(),
              });
              break;
            } else {
              this.context.addLastMessage({
                role: "assistant",
                content: `第${step.index}步执行失败，正在重试（${retryCount}/${MAX_RETRY}）... 错误信息：${toolResult?.result?.error || stepResult?.error}`,
                created_at: Date.now(),
              });
            }
          } else {
            success = true;
          }
        }
      }

      // 3. 总结（主对话流）
      this.context.pushMessage({
        role: "user",
        content: "请用自然语言对本次任务执行过程进行总结。",
        created_at: Date.now(),
      });
      let content = "";
      let reasoner = "";
      this.context.addLastMessage({
        role: "assistant",
        content: "",
        created_at: Date.now(),
        loading: true,
      });
      await this.model.stream(this.context.getCompletionMessages(), (chunk) => {
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
      return this.context.getLastMessage();
    } catch (error: any) {
      // 4. 错误处理
      this.context.pushMessage({
        role: "user",
        content: `执行过程中遇到错误：${error.message}，请分析原因并给出恢复建议。`,
        created_at: Date.now(),
      });
      await this.model.stream(this.context.getCompletionMessages());
      throw error;
    }
  }
}

// 注册 PlanAndExecute
EngineManager.register("plan-and-execute", {
  name: "PlanAndExecute",
  description:
    "PlanAndExecute 是一种基于计划的执行模式，它允许模型在对话中生成计划，并根据计划执行工具调用。",
  create: (agent: Agent) => new PlanAndExecute(agent),
});
