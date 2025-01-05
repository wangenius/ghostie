import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Model {
  name: string;
  api_key: string;
  api_url: string;
  model: string;
  is_current?: boolean;
}

export function ModelsTab() {
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    loadModels();
    
    // 监听模型更新事件
    const unsubscribeModel = listen("model-updated", () => {
      loadModels();
    });

    return () => {
      unsubscribeModel.then(fn => fn());
    };
  }, []);

  const loadModels = async () => {
    try {
      const modelsList = await invoke<Array<Record<string, string>>>("list_models");
      setModels(
        modelsList.map((model) => ({
          name: model.name,
          is_current: model.is_current === "true",
          api_url: model.api_url,
          model: model.model,
          api_key: "",
        })).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  };

  const handleOpenModelAdd = async () => {
    await invoke("open_window", { name: "model-add" });
  };

  const handleDeleteModel = async (name: string) => {
    try {
      await invoke("remove_model", { name });
      await loadModels();
    } catch (error) {
      console.error("删除模型失败:", error);
    }
  };

  const handleSetCurrentModel = async (name: string) => {
    try {
      await invoke("set_current_model", { name });
      await loadModels();
    } catch (error) {
      console.error("设置当前模型失败:", error);
    }
  };

  const handleOpenModelEdit = async (model: Model) => {
    try {
      const query = await invoke<Record<string, string>>("get_model", { name: model.name });
      await invoke("open_window_with_query", {
        name: "model-edit",
        query
      });
    } catch (error) {
      console.error("打开模型编辑窗口失败:", error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenModelAdd}
          className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">添加模型</span>
        </button>
        {models.map((model) => (
          <div
            key={model.name}
            onClick={() => !model.is_current && handleSetCurrentModel(model.name)}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border ${
              model.is_current ? "bg-secondary border-primary/30" : "hover:bg-secondary border-border"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={model.is_current ? "text-primary" : "text-muted-foreground"}>
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-medium truncate ${model.is_current ? "text-primary" : "text-foreground"}`}>
                    {model.name}
                  </div>
                  {model.is_current && (
                    <span className="flex-shrink-0 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      当前使用
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{model.model}</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModelEdit(model);
                }}
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(model.name);
                }}
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