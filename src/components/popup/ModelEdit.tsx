import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Model {
  name: string;
  api_key: string;
  api_url: string;
  model: string;
}

const defaultModel: Model = {
  name: "",
  api_key: "",
  api_url: "",
  model: "",
};

export function ModelEdit() {
  const [model, setModel] = useState<Model>(defaultModel);
  const [originalName, setOriginalName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unlisten = listen<Record<string, string>>("query-params", (event) => {
      const { name, api_key, api_url, model } = event.payload;
      if (name) {
        setOriginalName(name);
        setModel({
          name,
          api_key: api_key || "",
          api_url: api_url || "",
          model: model || "",
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
    setModel(defaultModel);
    window.hide();
  };

  const handleSubmit = async () => {
    try {
      await invoke("update_model", {
        oldName: originalName,
        name: model.name,
        apiKey: model.api_key,
        apiUrl: model.api_url,
        model: model.model,
      });
      await emit("model-updated");
      await handleClose();
    } catch (error) {
      console.error("更新模型失败:", error);
    }
  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <div 
        className="flex items-center justify-between h-12 px-4 border-b border-border" 
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-foreground">编辑模型</div>
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
            <label className="block text-xs text-muted-foreground">模型名称</label>
            <input
              ref={inputRef}
              type="text"
              value={model.name}
              onChange={(e) => setModel({ ...model, name: e.target.value })}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="请输入模型名称"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">API Key</label>
            <input
              type="password"
              value={model.api_key}
              onChange={(e) => setModel({ ...model, api_key: e.target.value })}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="如需更新 API Key 请输入新的值"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">API URL：</label>
            <input
              type="text"
              value={model.api_url}
              onChange={(e) => setModel({ ...model, api_url: e.target.value })}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="整个 API URL，包括base_url/v1/chat/completions"
            />
            <small className="text-xs text-muted-foreground">
              比如：https://api.openai.com/v1/chat/completions
            </small>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">模型名称</label>
            <input
              type="text"
              value={model.model}
              onChange={(e) => setModel({ ...model, model: e.target.value })}
              className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
              placeholder="如：gpt-3.5-turbo"
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
          disabled={!model.name}
          className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
} 