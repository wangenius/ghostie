import { BotProps } from "@/common/types/bot";
import { gen } from "@/utils/generator";
import { Echo } from "echo-state";

/** 机器人管理器, 用于管理机器人 */
export class BotManager {
  /* 所有的机器人在这里存储 */
  static store = new Echo<Record<string, BotProps>>(
    {},
    {
      name: "bots",
    },
  );

  /* 使用机器人管理器的hook方法 */
  static use = BotManager.store.use.bind(BotManager.store);

  /* 添加机器人 */
  static add(bot: Omit<BotProps, "id">) {
    const id = gen.id();
    BotManager.store.set({
      [id]: {
        ...bot,
        id,
      },
    });
  }

  static get(id: string) {
    return BotManager.store.current[id];
  }

  /* 删除机器人 */
  static remove(id: string) {
    BotManager.store.delete(id);
  }

  /* 更新机器人 */
  static update(bot: BotProps) {
    BotManager.store.set({
      [bot.id]: bot,
    });
  }

  /* 切换置顶状态 */
  static togglePin(id: string) {
    const bot = this.get(id);
    if (bot) {
      this.update({
        ...bot,
        pinned: !bot.pinned,
      });
    }
  }

  /* 记录使用 */
  static recordUsage(id: string) {
    const bot = this.get(id);
    if (bot) {
      this.update({
        ...bot,
        usageCount: (bot.usageCount || 0) + 1,
        lastUsed: Date.now(),
      });
    }
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
      Object.values(bots).forEach((bot) => {
        BotManager.add(bot);
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("JSON格式不正确");
      }
      throw error;
    }
  }
}
