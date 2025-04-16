import { PluginMarketProps, PluginProps } from "@/plugin/types";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { parsePluginFromString } from "./parser";
import * as ts from "typescript";
import { supabase } from "@/utils/supabase";

/* 默认 */
export const DEFAULT_PLUGIN: PluginProps = {
  id: "",
  name: "",
  description: "",
  tools: [],
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
    const plugin = (await PluginStore.getCurrent())[id];
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
      // 获取插件内容（TypeScript代码）
      const tsContent = await Echo.get<string>({
        database: PLUGIN_DATABASE_CONTENT,
        name: this.props.id,
      }).getCurrent();

      // 使用TypeScript编译器将TypeScript代码编译成JavaScript代码
      const jsContent = this.compileTypeScriptToJavaScript(tsContent);

      // 调用后端执行JavaScript代码
      const result = await cmd.invoke("plugin_execute", {
        content: jsContent,
        tool: tool,
        args: args,
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new Error(
        `执行插件时出错:${typeof error === "object" ? JSON.stringify(error) : error}`,
      );
    }
  }

  /** 将TypeScript代码编译成JavaScript代码
   * @param tsContent TypeScript代码
   * @returns 编译后的JavaScript代码
   */
  private compileTypeScriptToJavaScript(tsContent: string): string {
    try {
      // 使用TypeScript编译器编译代码
      const result = ts.transpileModule(tsContent, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          esModuleInterop: true,
        },
      });

      return result.outputText;
    } catch (error) {
      console.error("编译TypeScript代码时出错:", error);
      throw new Error("TypeScript编译失败");
    }
  }

  static async fetchMarketData(
    page: number = 1,
    limit: number = 10,
  ): Promise<PluginMarketProps[]> {
    // Get current page data
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw JSON.stringify(error);
    }
    return (data as PluginMarketProps[]) || [];
  }

  static async installFromMarket(data: PluginMarketProps) {
    const plugin = new ToolPlugin({
      id: data.id,
      name: data.name,
      description: data.description,
    });
    await plugin.updateContent(data.content.trim());
    return plugin;
  }

  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("plugins").delete().eq("id", id);
    if (error) {
      throw JSON.stringify(error);
    }
  }

  async uploadToMarket(content: string) {
    /* 检查是否已经有了 */
    const { data } = await supabase
      .from("plugins")
      .select("id")
      .eq("id", this.props.id);
    if (data && data.length > 0) {
      throw new Error("key already exists");
    }
    const { error } = await supabase.from("plugins").insert({
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      content: content,
    });
    if (error) {
      throw JSON.stringify(error);
    }
    return;
  }
}
