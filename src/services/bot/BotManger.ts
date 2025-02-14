import { BotProps } from "@common/types/bot";
import { Echo } from "echo-state";
import { Bot } from "./bot";
import { gen } from "@/utils/generator";

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
    id: "",
    name: "",
    system: "",
    model: "",
    tools: [],
  });

  static setCurrent(id?: string) {
    if (!id) {
      BotManager.current = new Bot({
        id: "",
        name: "",
        system: "",
        model: "",
        tools: [],
      });
    } else {
      BotManager.current = new Bot(BotManager.store.current[id]);
    }
  }

  static use = BotManager.store.use.bind(BotManager.store);

  static add(bot: Omit<BotProps, "id">) {
    const id = gen.id();
    BotManager.store.set({
      [id]: {
        ...bot,
        id,
      },
    });
  }

  static remove(id: string) {
    BotManager.store.delete(id);
  }

  static update(bot: BotProps) {
    BotManager.store.set({
      [bot.id]: bot,
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
