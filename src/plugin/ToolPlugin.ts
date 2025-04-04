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
/* 插件index */
export const PLUGIN_DATABASE_INDEX = "plugins_index";
/* 插件内容 */
export const PLUGIN_DATABASE_CONTENT = "plugins_content";

export class ToolPlugin {
  private store = new Echo<PluginProps>(DEFAULT_PLUGIN);
  private content = new Echo<string>("");
  props: PluginProps = DEFAULT_PLUGIN;
  /** 构造函数 */
  constructor(plugin?: Partial<PluginProps>) {
    this.props = { ...DEFAULT_PLUGIN, ...plugin };
    if (plugin?.id) {
    }
  }

  use = this.store.use.bind(this.store);
  useContent = this.content.use.bind(this.content);

  /** 切换插件
   * 将当前实例的代表 的插件 切换为 id 的插件
   */
  async switch(id: string): Promise<ToolPlugin> {
    this.store.indexed({
      database: PLUGIN_DATABASE_INDEX,
      name: id,
    });
    this.props = await this.store.getCurrent();
    this.content.indexed({
      database: PLUGIN_DATABASE_CONTENT,
      name: id,
    });
    return this;
  }

  /** 创建插件
   * 创建一个新插件
   */
  static async create(config: Partial<PluginProps> = {}): Promise<ToolPlugin> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const plugin = new ToolPlugin({ ...config, id });
    await plugin.store
      .indexed({
        database: PLUGIN_DATABASE_INDEX,
        name: id,
      })
      .ready(plugin.props, { replace: true });
    await plugin.content
      .indexed({
        database: PLUGIN_DATABASE_CONTENT,
        name: id,
      })
      .ready();
    /* 返回代理 */
    return plugin;
  }

  /** 获取插件
   * 获取一个插件
   */
  static async get(id: string): Promise<ToolPlugin> {
    /* 获取插件 */
    const plugin = Echo.get<PluginProps>({
      database: PLUGIN_DATABASE_INDEX,
      name: id,
    });
    /* 等待插件 */
    const current = await plugin.getCurrent();
    /* 如果插件不存在 */
    if (!current) {
      throw new Error("Plugin not found");
    }
    const plug = new ToolPlugin(current);
    await plug.store
      .indexed({
        database: PLUGIN_DATABASE_INDEX,
        name: current.id,
      })
      .ready(current, { replace: true });
    await plug.content
      .indexed({
        database: PLUGIN_DATABASE_CONTENT,
        name: current.id,
      })
      .ready();
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
    this.store.set(this.props);
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
    this.content.set(content);

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
    /* 删除状态 */
    await Echo.get<PluginProps>({
      database: PLUGIN_DATABASE_INDEX,
      name: id,
    }).discard();
    /* 删除内容 */
    await Echo.get<string>({
      database: PLUGIN_DATABASE_CONTENT,
      name: id,
    }).discard();
  }

  /** 关闭插件
   * 关闭一个插件, 变成临时数据并清空
   */
  close() {
    /* 临时 */
    this.store.temporary().reset();
    /* 临时 */
    this.content.temporary().reset();
  }

  /** 执行插件
   * 执行一个插件
   */
  async execute(tool: string, args: Record<string, unknown>) {
    try {
      const result = await cmd.invoke("plugin_execute", {
        content: await this.content.getCurrent(),
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
