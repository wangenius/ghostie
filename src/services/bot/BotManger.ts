import { BotProps } from "@common/types/bot";
import { Echo } from "echo-state";
import { Bot } from "./bot";

/** 助手管理器, 用于管理助手 */
export class BotManager {
  static store = new Echo<Record<string, BotProps>>(
    {},
    {
      name: "bots",
      sync: true,
    }
  );

  static current = new Bot({
    name: "",
    system: "",
    model: "",
    tools: [],
  });

  static setCurrent(bot: BotProps) {
    BotManager.current = new Bot(bot);
  }

  static use = BotManager.store.use.bind(BotManager.store);

  static add(bot: BotProps) {
    /* 判断是否已经有这个模型 */
    if (BotManager.store.current[bot.name]) {
      throw new Error(`助手 ${bot.name} 已存在`);
    }
    BotManager.store.set({
      [bot.name]: bot,
    });
  }

  static remove(name: string) {
    BotManager.store.delete(name);
  }

  static update(name: string, bot: BotProps) {
    if (!BotManager.store.current[name]) {
      throw new Error(`助手 ${name} 不存在`);
    }
    if (name !== bot.name) {
      BotManager.store.delete(name);
    }
    BotManager.store.set({
      [bot.name]: bot,
    });
  }

  /** 导出所有助手配置 */
  static export(): string {
    const bots = this.store.current;
    return JSON.stringify(bots, null, 2);
  }

  /** 导入助手配置
   * @param jsonStr JSON字符串
   * @throws 如果JSON格式不正确或助手配置无效
   */
  static import(jsonStr: string) {
    try {
      const bots = JSON.parse(jsonStr) as Record<string, BotProps>;

      // 验证每个助手的必要字段
      Object.entries(bots).forEach(([name, bot]) => {
        if (!bot.name || !bot.system || !bot.model) {
          throw new Error(`助手 "${name}" 缺少必要字段`);
        }
        // 确保name字段与key一致
        bot.name = name;
      });

      // 更新存储
      this.store.set(bots);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("JSON格式不正确");
      }
      throw error;
    }
  }
}
