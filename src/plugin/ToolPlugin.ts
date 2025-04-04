import { PluginProps } from "@/plugin/types";
import { gen } from "@/utils/generator";
import { Echo } from "echo-state";

export const DEFAULT_PLUGIN: PluginProps = {
  id: "",
  name: "",
  description: "",
  version: "",
  tools: [],
  user_id: "",
};
/* 数据库名称 */
export const PLUGIN_DATABASE_INDEX = "plugins_index";
export const PLUGIN_DATABASE_CONTENT = "plugins_content";

export class ToolPlugin {
  private store = new Echo<PluginProps>(DEFAULT_PLUGIN);
  private content = new Echo<string>("");
  props: PluginProps = DEFAULT_PLUGIN;
  /** 构造函数 */
  constructor(plugin?: Partial<PluginProps>) {
    this.props = { ...DEFAULT_PLUGIN, ...plugin };
    if (plugin?.id) {
      this.store
        .indexed({
          database: PLUGIN_DATABASE_INDEX,
          name: plugin.id,
        })
        .ready(this.props, { replace: true });
      this.content
        .indexed({
          database: PLUGIN_DATABASE_CONTENT,
          name: plugin.id,
        })
        .ready();
    }
  }

  use = this.store.use.bind(this.store);
  useContent = this.content.use.bind(this.content);

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

  static async create(config: Partial<PluginProps> = {}): Promise<ToolPlugin> {
    /* 生成ID */
    const id = gen.id();
    /* 创建代理 */
    const plugin = new ToolPlugin({ ...config, id });

    /* 返回代理 */
    return plugin;
  }

  static async get(id: string): Promise<ToolPlugin> {
    const plugin = Echo.get<PluginProps>({
      database: PLUGIN_DATABASE_INDEX,
      name: id,
    });
    await plugin.ready();
    if (!plugin.current) {
      throw new Error("Plugin ID not found");
    }
    return new ToolPlugin(plugin.current);
  }

  async update(data: Partial<Omit<PluginProps, "id">>) {
    if (!this.props.id) {
      return this;
    }
    /* 实例 */
    this.props = { ...this.props, ...data };
    this.store.set(this.props);
    return this;
  }

  async updateContent(content: string) {
    if (!this.props.id) {
      return this;
    }
    this.content.set(content);
    return this;
  }

  static async delete(id: string) {
    /* 删除状态 */
    await Echo.get<PluginProps>({
      database: PLUGIN_DATABASE_INDEX,
      name: id,
    }).discard();
    await Echo.get<string>({
      database: PLUGIN_DATABASE_CONTENT,
      name: id,
    }).discard();
  }

  close() {
    this.store.temporary().reset();
    this.content.temporary().reset();
  }

  execute() {
    return this.content.getCurrent();
  }
}
