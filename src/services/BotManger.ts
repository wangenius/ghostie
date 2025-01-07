import { invoke } from "@tauri-apps/api/core";
import { Echo } from "../utils/Echo";

export interface Bot {
  name: string;
  system_prompt: string;
}

export class BotManager {
  static state = new Echo<{
    list: Bot[];
    current: string;
  }>({
    list: [],
    current: "",
  });

  static use = BotManager.state.use.bind(BotManager.state);

  static setCurrent = (name: string) => {
    BotManager.state.set(
      (state) => ({
        ...state,
        current: name,
      }),
      true
    );
  };

  static loadBots = async () => {
    const bots = await invoke<Bot[]>("list_bots");
    BotManager.state.set(
      {
        list: bots,
        current: bots[0].name,
      },
      true
    );
  };
}
