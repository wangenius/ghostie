import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RoleAdd() {
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
      await handleClose();
    } catch (error) {
      console.error("添加 bot 失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div
        className="flex items-center justify-between h-12 px-4 border-b border-neutral-100"
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-neutral-800">添加角色</div>
        <button
          onClick={handleClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-neutral-500">角色名称</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-neutral-100 rounded-md text-sm focus:bg-neutral-200 transition-colors outline-none placeholder:text-neutral-400"
              placeholder="输入 Bot 名称"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-neutral-500">系统提示词</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-100 rounded-md text-sm focus:bg-neutral-200 transition-colors outline-none min-h-[160px] resize-none placeholder:text-neutral-400"
              placeholder="输入系统提示词"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-neutral-100">
        <button
          onClick={handleClose}
          className="px-3 h-8 text-xs text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name || !systemPrompt || isSubmitting}
          className="px-3 h-8 text-xs text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-neutral-900 transition-colors"
        >
          {isSubmitting ? "创建中..." : "创建"}
        </button>
      </div>
    </div>
  );
}
