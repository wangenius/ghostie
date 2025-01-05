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
      const botsList = await invoke<Array<Bot>>("list_bots");
      setBots(
        botsList.sort((a, b) => a.name.localeCompare(b.name))
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
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加机器人
        </button>
      </div>
      <div className="space-y-1">
        {bots.map((bot) => (
          <div
            key={bot.name}
            className="flex items-center justify-between h-14 px-3 -mx-3 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="text-gray-400">
                <Bot className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-sm text-gray-600">{bot.name}</div>
                <div className="text-xs text-gray-400 line-clamp-1">{bot.system_prompt}</div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleOpenBotEdit(bot.name)}
                className="p-2 text-gray-400 hover:text-blue-500"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteBot(bot.name)}
                className="p-2 text-gray-400 hover:text-red-500"
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