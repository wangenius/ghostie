import { BotProps } from "@/common/types/bot";
import { PluginsStore } from "@/page/settings/PluginsTab";
import { Echo } from "echo-state";
import { Context } from "../agent/Context";
import { ChatModel } from "../model/ChatModel";
import { ModelManager } from "../model/ModelManager";
import { ToolProps } from "@/common/types/plugin";
import { SettingsManager } from "../settings/SettingsManager";

export const TOOL_NAME_SPLIT = "-";

/* 机器人配置 */
const defaultConfig: BotProps = {
  id: "",
  name: "",
  system: "",
  model: "",
  tools: [],
};
/*
 * 机器人
 */
export class Bot {
  /* 机器人名称 */
  name: string;
  /* 机器人系统提示 */
  system: string;
  /* 机器人模型 */
  model: ChatModel;
  /* 机器人工具 */
  tools: string[];
  /* 机器人上下文 */
  context: Context;
  /* 加载状态 */
  loading = new Echo<{ status: boolean }>({
    status: false,
  });
  /* 机器人配置 */
  constructor(config: BotProps = defaultConfig) {
    /* 机器人名称 */
    this.name = config.name;
    /* 机器人系统提示 */
    this.system = config.system;
    /* 机器人模型 */
    const model = ModelManager.get(config.model);

    // 解析工具字符串，格式为 "tool_name@plugin_name"
    const tools: ToolProps[] = Object.values(PluginsStore.current)
      .flatMap((plugin) =>
        plugin.tools.map((tool) => ({
          ...tool,
          plugin: plugin.id,
          // 添加完整名称，用于匹配
          name: `${tool.name}${TOOL_NAME_SPLIT}${plugin.id}`,
          pluginName: plugin.name,
        }))
      )
      .filter((tool) => {
        return config.tools.includes(tool.name);
      });
    this.model = new ChatModel(model)
      .setBot(config.id)
      .setTools(tools)
      .system(config.system);
    this.tools = config.tools || [];
    this.context = new Context();
  }

  /* 机器人对话，使用ReAct循环 */
  public async chat(input: string) {
    try {
      /* 重置上下文 */
      this.context.reset();
      this.loading.set({ status: true });

      // ReAct循环
      let currentInput = input || undefined;
      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        // 思考和行动阶段：让模型生成响应和可能的工具调用
        const response = await this.model.stream(currentInput, {
          user: iterations === 1 ? "user:input" : "user:hidden",
          assistant: "assistant:reply",
          function: "function:result",
        });

        // 如果没有工具调用，说明对话可以结束
        if (!response.tool) {
          break;
        }

        // 观察阶段：执行工具调用并获取结果
        // 工具调用的结果会自动被添加到对话历史中
        // 更新输入，让模型基于工具执行结果继续思考
        currentInput = undefined;
      }

      // 如果达到最大迭代次数，生成一个说明
      if (iterations >= MAX_ITERATIONS) {
        await this.model.stream(
          "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
          {
            user: "user:hidden",
            assistant: "assistant:reply",
            function: "function:result",
          }
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    } finally {
      this.loading.set({ status: false });
    }
  }
}
