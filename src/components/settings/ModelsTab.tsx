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
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={handleOpenModelAdd}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加模型
        </button>
      </div>
      <div className="space-y-1">
        {models.map((model) => (
          <div
            key={model.name}
            onClick={() => !model.is_current && handleSetCurrentModel(model.name)}
            className={`flex items-center justify-between h-14 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
              model.is_current ? "bg-secondary" : "hover:bg-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={model.is_current ? "text-primary" : "text-muted-foreground"}>
                <Database className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className={`text-sm ${model.is_current ? "text-primary" : "text-foreground"}`}>
                  {model.name}
                </div>
                <div className="text-xs text-muted-foreground">{model.model}</div>
              </div>
            </div>
            <div className="flex items-center">
              {model.is_current && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded mr-2">
                  当前使用
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModelEdit(model);
                }}
                className="p-2 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(model.name);
                }}
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