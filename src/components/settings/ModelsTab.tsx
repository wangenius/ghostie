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
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              model.is_current ? "bg-blue-50/70" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={model.is_current ? "text-blue-500" : "text-gray-400"}>
                <Database className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className={`text-sm ${model.is_current ? "text-blue-600" : "text-gray-600"}`}>
                  {model.name}
                </div>
                <div className="text-xs text-gray-400">{model.model}</div>
              </div>
            </div>
            <div className="flex items-center">
              {model.is_current && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded mr-2">
                  当前使用
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModelEdit(model);
                }}
                className="p-2 text-gray-400 hover:text-blue-500"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(model.name);
                }}
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