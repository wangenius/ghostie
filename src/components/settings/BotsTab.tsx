import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { BotManager } from "../../services/BotManger";
import { ask } from "@tauri-apps/plugin-dialog";

interface Bot {
  name: string;
  system_prompt: string;
}

export function BotsTab() {
  const { list } = BotManager.use();

  useEffect(() => {
    BotManager.loadBots();

    // 监听机器人更新事件
    const unsubscribeBot = listen("bot-updated", () => {
      BotManager.loadBots();
    });

    return () => {
      unsubscribeBot.then(fn => fn());
    };
  }, []);



  const handleOpenBotAdd = async () => {
    await invoke("open_window_with_query", { name: "bot-edit" });
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
      const answer = await ask(`确定要删除机器人 "${name}" 吗？`, { 
        title: "Tauri",
        kind: "warning",
      });

      if (answer) {
        await invoke("remove_bot", { name });
        BotManager.loadBots();
      }
    } catch (error) {
      console.error("删除机器人失败:", error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenBotAdd}
          className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">添加机器人</span>
        </button>
        {list.map((bot) => (
          <div
            key={bot.name}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-muted-foreground">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{bot.name}</div>
                <div className="text-xs text-muted-foreground truncate">{bot.system_prompt}</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => handleOpenBotEdit(bot.name)}
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteBot(bot.name)}
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 