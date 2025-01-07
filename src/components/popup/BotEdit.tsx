import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Bot {
  name: string;
  system_prompt: string;
}

const defaultBot: Bot = {
  name: "",
  system_prompt: "",
};

export function BotEdit() {
  const [bot, setBot] = useState<Bot>(defaultBot);
  const [originalName, setOriginalName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unlisten = listen<Bot>("query-params", (event) => {
      const { name, system_prompt } = event.payload;
      if (name) {
        setOriginalName(name);
        setBot({
          name,
          system_prompt: system_prompt || "",
        });
      }
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleClose = async () => {
    const window = await getCurrentWindow();
    setBot(defaultBot);
    window.hide();
  };

  const handleSubmit = async () => {
    try {
      await invoke("update_bot", {
        oldName: originalName,
        name: bot.name,
        systemPrompt: bot.system_prompt,
      });
      await emit("bot-updated");
      await handleClose();
    } catch (error) {
      console.error("更新机器人失败:", error);
    }
  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <div 
        className="flex items-center justify-between h-12 px-4 border-b border-border" 
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-foreground">编辑机器人</div>
        <button
          onClick={handleClose}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col">
        <div className="space-y-4 flex flex-col flex-1">
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">机器人名称</label>
            <input
              ref={inputRef}
              type="text"
              value={bot.name}
              onChange={(e) => setBot({ ...bot, name: e.target.value })}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="请输入机器人名称"
            />
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="block text-xs text-muted-foreground">机器人提示词</label>
            <textarea
              value={bot.system_prompt}
              onChange={(e) => setBot({ ...bot, system_prompt: e.target.value })}
              className="w-full flex-1 px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground resize-none"
              placeholder="请输入机器人提示词"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={handleClose}
          className="px-3 h-8 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!bot.name || !bot.system_prompt}
          className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
} 