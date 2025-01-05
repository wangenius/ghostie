import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";

export function BotAdd() {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = async () => {
    const window = await getCurrentWindow();
    setName("");
    setSystemPrompt("");
    window.hide();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await invoke("add_bot", { name, systemPrompt });
      await emit("bot-updated");
      await handleClose();
    } catch (error) {
      console.error("添加 bot 失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <div
        className="flex items-center justify-between h-12 px-4 border-b border-border"
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-foreground">添加机器人</div>
        <button
          onClick={handleClose}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">机器人名称</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="输入 Bot 名称"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">系统提示词</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none min-h-[160px] resize-none placeholder:text-muted-foreground"
              placeholder="输入系统提示词"
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
          disabled={!name || !systemPrompt || isSubmitting}
          className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "创建中..." : "创建"}
        </button>
      </div>
    </div>
  );
}
