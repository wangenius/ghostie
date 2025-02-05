import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Model {
  api_key: string;
  api_url: string;
  model: string;
}

interface ModelManager {
  models: Record<string, Model>;
  current: string | null;
}

export function ModelsTab() {
  const [models, setModels] = useState<ModelManager>({ models: {}, current: null });


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
      const modelsList = await invoke<ModelManager>("list_models");
      setModels(modelsList);
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  };

  const handleOpenModelAdd = async () => {
    await invoke("open_window", { name: "model-edit" });
  };

  const handleDeleteModel = async (name: string) => {
    const answer = await ask(`确定要删除模型 "${name}" 吗？`, {
      title: "Tauri",
      kind: "warning",
    });

    if (answer) {
      try {
        await invoke("remove_model", { name });
        await loadModels();
      } catch (error) {
        console.error("删除模型失败:", error);
      }
    }
  };

  const handleSetCurrentModel = async (name: string) => {
    try {
      console.log("设置当前模型:", name);
      await invoke("set_current_model", { name });
      await loadModels();
    } catch (error) {
      console.error("设置当前模型失败:", error);
    }
  };

  const handleOpenModelEdit = async (name: string) => {
    try {
      const query = await invoke<Record<string, string>>("get_model", { name });
      await invoke("open_window", {
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
        {Object.entries(models.models).map(([name, model]) => (
          <div
            key={name}
            onClick={() => name !== models.current && handleSetCurrentModel(name)}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border ${name === models.current ? "bg-secondary border-primary/30" : "hover:bg-secondary border-border"
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={name === models.current ? "text-primary" : "text-muted-foreground"}>
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-medium truncate ${name === models.current ? "text-primary" : "text-foreground"}`}>
                    {name}
                  </div>
                  {name === models.current && (
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
                  handleOpenModelEdit(name);
                }}
                className="p-1.5 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(name);
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