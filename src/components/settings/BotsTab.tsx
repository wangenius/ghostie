import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Bot {
  name: string;
  system_prompt: string;
}

export function BotsTab() {
  const [bots, setBots] = useState<Bot[]>([]);

  useEffect(() => {
    loadBots();
    
    // 监听机器人更新事件
    const unsubscribeBot = listen("bot-updated", () => {
      loadBots();
    });

    return () => {
      unsubscribeBot.then(fn => fn());
    };
  }, []);

  const loadBots = async () => {
    try {
      const botsList = await invoke<{bots: Bot[]}>("list_bots");
      console.log(botsList);
      setBots(
        botsList.bots
      );
    } catch (error) {
      console.error("加载机器人列表失败:", error);
    }
  };

  const handleOpenBotAdd = async () => {
    await invoke("open_window", { name: "bot-add" });
  };

  const handleOpenBotEdit = async (name: string) => {
    const query = await invoke<Bot>("get_bot", { name });
    await invoke("open_window_with_query", {
      name: "bot-edit",
      query
    });
  };

  const handleDeleteBot = async (name: string) => {
    try {
      await invoke("remove_bot", { name });
      await loadBots();
    } catch (error) {
      console.error("删除机器人失败:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={handleOpenBotAdd}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加机器人
        </button>
      </div>
      <div className="space-y-1">
        {bots.map((bot) => (
          <div
            key={bot.name}
            className="flex items-center justify-between h-14 px-3 -mx-3 rounded-lg hover:bg-secondary"
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                <Bot className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-sm text-foreground">{bot.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{bot.system_prompt}</div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleOpenBotEdit(bot.name)}
                className="p-2 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteBot(bot.name)}
                className="p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 