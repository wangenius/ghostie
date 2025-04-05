import { PluginProps } from "@/plugin/types";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { parsePluginFromString } from "./parser";

/* 默认 */
export const DEFAULT_PLUGIN: PluginProps = {
  id: "",
  name: "",
  description: "",
  version: "",
  tools: [],
  user_id: "",
};
export const PLUGIN_DATABASE_INDEX = "plugins_index";
export const PLUGIN_DATABASE_CONTENT = "plugins_content";

export const PluginStore = new Echo<Record<string, PluginProps>>({}).indexed({
  database: PLUGIN_DATABASE_INDEX,
  name: "plugins",
});

export class ToolPlugin {
  props: PluginProps = DEFAULT_PLUGIN;
  /** 构造函数 */
  constructor(plugin?: Partial<PluginProps>) {
    this.props = { ...DEFAULT_PLUGIN, ...plugin };
  }

  /** 创建插件
   * 创建一个新插件
   */
  static async create(config: Partial<PluginProps> = {}): Promise<ToolPlugin> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const plugin = new ToolPlugin({ ...config, id });
    /* 保存插件 */
    PluginStore.set({
      [id]: plugin.props,
    });
    /* 返回代理 */
    return plugin;
  }

  /** 获取插件
   * 获取一个插件
   */
  static async get(id: string): Promise<ToolPlugin> {
    /* 获取插件 */
    const plugin = PluginStore.current[id];
    /* 如果插件不存在 */
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    const plug = new ToolPlugin(plugin);
    /* 返回插件 */
    return plug;
  }

  /** 更新插件
   * 更新一个插件
   */
  async update(data: Partial<Omit<PluginProps, "id">>) {
    if (!this.props.id) {
      return this;
    }
    /* 实例 */
    this.props = { ...this.props, ...data };
    PluginStore.set({
      [this.props.id]: this.props,
    });
    return this;
  }

  /** 处理插件内容
   * 解析插件内容并更新插件信息
   */
  async processContent(
    content: string,
  ): Promise<Pick<PluginProps, "name" | "description" | "tools">> {
    try {
      const parsedFunctions = parsePluginFromString(content);
      return {
        name: parsedFunctions.meta.name || "undefined",
        description: parsedFunctions.meta.description || "",
        tools: Object.values(parsedFunctions.tools).map((tool) => ({
          ...tool,
          plugin: this.props.id,
        })),
      };
    } catch (error) {
      console.error("处理插件内容时出错:", error);
      throw new Error("插件内容处理失败");
    }
  }

  /** 更新插件内容
   * 更新一个插件的内容并处理插件信息
   */
  async updateContent(content: string) {
    if (!this.props.id) {
      return this;
    }

    // 保存内容
    Echo.get<string>({
      database: PLUGIN_DATABASE_CONTENT,
      name: this.props.id,
    }).ready(content);

    // 处理插件内容
    const pluginInfo = await this.processContent(content);

    // 更新插件信息
    await this.update({
      name: pluginInfo.name,
      description: pluginInfo.description,
      tools: pluginInfo.tools.map((tool) => ({
        ...tool,
        plugin: this.props.id,
      })),
    });

    return this;
  }

  /** 删除插件
   * 删除一个插件
   */
  static async delete(id: string) {
    PluginStore.delete(id);
    /* 删除内容 */
    await Echo.get<string>({
      database: PLUGIN_DATABASE_CONTENT,
      name: id,
    }).discard();
  }

  /** 执行插件
   * 执行一个插件
   */
  async execute(tool: string, args: Record<string, unknown>) {
    try {
      const result = await cmd.invoke("plugin_execute", {
        content: await Echo.get<string>({
          database: PLUGIN_DATABASE_CONTENT,
          name: this.props.id,
        }).getCurrent(),
        tool: tool,
        args: args,
      });
      return result;
    } catch (error) {
      console.error("执行插件时出错:", error);
      throw new Error("插件执行失败");
    }
  }
}
