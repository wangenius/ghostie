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
}

console.log(BotManager.store.current);
