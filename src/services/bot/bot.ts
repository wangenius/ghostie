import { BotProps } from "@/common/types/bot";
import { PluginsStore } from "@/page/settings/PluginsTab";
import { Echo } from "echo-state";
import { Context } from "../agent/Context";
import { ChatModel } from "../model/ChatModel";
import { ModelManager } from "../model/ModelManager";
import { ToolProps } from "@/common/types/plugin";
/*
 * 机器人
 */
export class Bot {
  name: string;
  system: string;
  model: ChatModel;
  tools: string[];
  context: Context;

  /** 加载状态 */
  loading = new Echo<{ status: boolean }>({
    status: false,
  });

  constructor(config: BotProps) {
    this.name = config.name;
    this.system = config.system;
    const model = ModelManager.get(config.model);

    // 解析工具字符串，格式为 "[plugin_name]tool_name"
    const tools: ToolProps[] = Object.values(PluginsStore.current)
      .flatMap((plugin) =>
        plugin.tools.map((tool) => ({
          ...tool,
          plugin: plugin.id,
          // 添加完整名称，用于匹配
          name: `[${plugin.name}]${tool.name}`,
          pluginName: plugin.name,
        }))
      )
      .filter((tool) => {
        return config.tools.includes(`${tool.name}`);
      });

    console.log(tools);

    this.model = new ChatModel(model).setTools(tools).system(config.system);
    this.tools = config.tools || [];
    this.context = new Context();
  }

  public async chat(input: string) {
    try {
      /* 重置上下文 */
      this.context.reset();
      this.loading.set({ status: true });
      const response = await this.model.stream(`${input}`);

      // 如果有工具调用，等待工具执行完成后再生成最终响应
      if (response.tool) {
        const prompt = `基于以上工具调用结果，请生成简约回应`;
        await this.model.stream(prompt);
      }
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    } finally {
      this.loading.set({ status: false });
    }
  }
}
