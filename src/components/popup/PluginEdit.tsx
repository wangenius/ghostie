import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PluginManager, Plugin } from "../../services/PluginManager";

export function PluginEdit() {
  const [name, setName] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [create, setCreate] = useState(true);
  const [plugin, setPlugin] = useState<Plugin | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const unlisten = listen<{ name: string, script_content: string }>("query-params", async (event) => {
      if (!event.payload) {
        setName("");
        setScriptContent("");
        setPlugin(null);
        setCreate(true);
        return;
      }
      const { name } = event.payload;
      if (name) {
        setName(name);
        const plugin = await PluginManager.getPlugin(name);
        setScriptContent(plugin?.script_content || "");
        setPlugin(plugin);
        setCreate(false);
      }
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleClose = async () => {
    const window = await getCurrentWindow();
    setName("");
    setScriptContent("");
    window.hide();
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (create) {
      try {
        setIsSubmitting(true);
        await PluginManager.addPlugin(name, scriptContent);
        await emit("plugin-updated");
        await handleClose();
      } catch (error) {
        console.error("添加插件失败:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        setIsSubmitting(true);
        if (!plugin) return;
        await PluginManager.updatePlugin(plugin.name, {
          name,
          script_content: scriptContent,
          enabled: plugin.enabled,
        });
        await emit("plugin-updated");
        await handleClose();
      } catch (error) {
        console.error("更新插件失败:", error);
      } finally {
        setIsSubmitting(false);
      }
    }


  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <div
        className="flex items-center justify-between h-12 px-4 border-b border-border"
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-foreground">添加插件</div>
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
            <label className="block text-xs text-muted-foreground">插件名称</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="输入插件名称"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">脚本内容</label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="w-full px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none min-h-[160px] resize-none placeholder:text-muted-foreground"
              placeholder="输入 JavaScript 脚本内容"
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
          disabled={!name || !scriptContent || isSubmitting}
          className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (create ? "创建中..." : "更新中...") : (create ? "创建" : "更新")}
        </button>
      </div>
    </div>
  );
}
