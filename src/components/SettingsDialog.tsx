import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Plus, Trash2, Edit2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

interface Model {
  name: string;
  api_key: string;
  api_url: string;
  model: string;
  is_current?: boolean;
}

export function SettingsDialog({ isOpen, onClose, embedded = false }: Props) {
  const [activeTab, setActiveTab] = useState<"models" | "general">("models");
  const [models, setModels] = useState<Model[]>([]);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "",
    api_key: "",
    api_url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo"
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const modelsList = await invoke<[string, boolean, string, string][]>("list_models");
      setModels(
        modelsList.map(([name, is_current, api_url, model]) => ({
          name,
          is_current,
          api_url,
          model,
          api_key: "" // API key 不会从后端返回
        }))
      );
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  };

  const handleAddModel = async () => {
    try {
      await invoke("add_model", {
        name: newModel.name,
        apiKey: newModel.api_key,
        apiUrl: newModel.api_url,
        model: newModel.model
      });
      await loadModels();
      setIsAddingModel(false);
      setNewModel({
        name: "",
        api_key: "",
        api_url: "https://api.openai.com/v1/chat/completions",
        model: "gpt-3.5-turbo"
      });
    } catch (error) {
      console.error("添加模型失败:", error);
    }
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

  const content = (
    <>
      {/* 头部 */}
      <div className="pt-2 px-4">
        <div className="relative">
          <div className="text-lg font-medium text-gray-900">设置</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="px-4 mt-4">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "models"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            模型管理
            {activeTab === "models" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "general"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            通用设置
            {activeTab === "general" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-4">
        {activeTab === "models" && (
          <div className="space-y-4">
            {/* 模型列表 */}
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.name}
                  className={`flex items-center justify-between p-3 rounded-lg group ${
                    model.is_current ? "bg-blue-50" : "bg-gray-50"
                  }`}
                  onClick={() => !model.is_current && handleSetCurrentModel(model.name)}
                >
                  <div>
                    <div className={`text-sm font-medium ${
                      model.is_current ? "text-blue-600" : "text-gray-900"
                    }`}>
                      {model.name}
                      {model.is_current && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <div>API URL: {model.api_url}</div>
                      <div>模型: {model.model}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model.name);
                      }}
                      className="p-1.5 rounded-md hover:bg-white text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 添加模型 */}
            {isAddingModel ? (
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    value={newModel.name}
                    onChange={(e) =>
                      setNewModel({ ...newModel, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入模型名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={newModel.api_key}
                    onChange={(e) =>
                      setNewModel({ ...newModel, api_key: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入 API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API URL
                  </label>
                  <input
                    type="text"
                    value={newModel.api_url}
                    onChange={(e) =>
                      setNewModel({ ...newModel, api_url: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入 API URL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型
                  </label>
                  <input
                    type="text"
                    value={newModel.model}
                    onChange={(e) =>
                      setNewModel({ ...newModel, model: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入模型名称，如：gpt-3.5-turbo"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    常用模型：gpt-3.5-turbo、gpt-4、gpt-4-32k
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsAddingModel(false)}
                    className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddModel}
                    disabled={!newModel.name || !newModel.api_key}
                    className="px-4 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    添加
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingModel(true)}
                className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors group"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">添加模型</span>
              </button>
            )}
          </div>
        )}

        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">更多设置选项开发中...</div>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="bg-white w-full rounded-lg">{content}</div>;
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center">
      <div className="bg-white w-full max-w-xl mt-16 rounded-lg shadow-xl">
        {content}
      </div>
    </div>
  );
} 