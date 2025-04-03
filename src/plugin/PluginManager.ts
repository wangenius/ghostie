import { PluginProps } from "@/plugin/plugin";
import { Echo } from "echo-state";

export class PluginManager {
  /* 插件列表 */
  static store = new Echo<Record<string, PluginProps>>({}).localStorage({
    name: "plugins",
  });

  /* 获取当前插件 */
  static get current() {
    return this.store.current;
  }

  /* 使用插件 */
  static use = this.store.use.bind(this.store);

  /* 设置插件 */
  static set = this.store.set.bind(this.store);

  /* 删除插件 */
  static delete = this.store.delete.bind(this.store);

  /* 获取插件 */
  static get(id: string) {
    return this.store.current[id];
  }
}
