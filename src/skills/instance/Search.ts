import { ChatModel } from "@/model/chat/ChatModel";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { PluginStore } from "@/plugin/ToolPlugin";
import { SkillManager } from "../SkillManager";

/** 网络搜索 */
SkillManager.register("getAllPlugins", {
  name: "获取所有的插件",
  description: "获取所有可用的插件，返回插件列表",
  params: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    const plugins = await PluginStore.getCurrent();
    const tools = Object.values(plugins).flatMap((plugin) => {
      return plugin.tools.map((tool) => {
        return {
          plugin: plugin.id,
          name: tool.name,
          description: tool.description,
        };
      });
    });
    return tools;
  },
});

/** 本地搜索 */
SkillManager.register("registerPlugin", {
  name: "注册插件",
  description: "注册插件",
  params: {
    type: "object",
    properties: {
      plugin: {
        type: "string",
        description: "id",
      },
      tool: {
        type: "string",
        description: "工具名称",
      },
    },
    required: ["plugin", "tool"],
  },
  execute: async (params: Record<string, any>, chatModel: ChatModel) => {
    const { plugin, tool } = params;
    chatModel.addTools(
      await ToolsHandler.transformAgentToolToModelFormat([
        {
          plugin,
          tool,
        },
      ]),
    );
    return "插件注册成功";
  },
});
