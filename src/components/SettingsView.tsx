import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Moon, Sun, Globe2, Keyboard, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { RoleAdd } from "./RoleAdd";

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

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  shortcut: string;
  autoUpdate: boolean;
}

export function SettingsView({ isOpen, onClose, embedded = false }: Props) {
  const [activeTab, setActiveTab] = useState<"models" | "roles" | "general" | "appearance" | "shortcuts" | "updates">("general");
  const [models, setModels] = useState<Model[]>([]);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    theme: 'system',
    language: 'zh-CN',
    shortcut: 'Ctrl+Shift+Space',
    autoUpdate: true,
  });
  const [newModel, setNewModel] = useState({
    name: "",
    api_key: "",
    api_url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const modelsList = await invoke<[string, boolean, string, string][]>(
        "list_models"
      );
      setModels(
        modelsList.map(([name, is_current, api_url, model]) => ({
          name,
          is_current,
          api_url,
          model,
          api_key: "", // API key 不会从后端返回
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
        model: newModel.model,
      });
      await loadModels();
      setIsAddingModel(false);
      setNewModel({
        name: "",
        api_key: "",
        api_url: "https://api.openai.com/v1/chat/completions",
        model: "gpt-3.5-turbo",
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

  const renderContent = () => {
    switch (activeTab) {
      case "models":
        return (
          <div className="space-y-4">
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
                    <div
                      className={`text-sm font-medium ${
                        model.is_current ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
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
        );
      case "roles":
        return (
          <div className="space-y-4">
            {isAddingRole ? (
              <RoleAdd
                isOpen={true}
                onClose={() => setIsAddingRole(false)}
                onSuccess={() => setIsAddingRole(false)}
                embedded={true}
              />
            ) : (
              <button
                onClick={() => setIsAddingRole(true)}
                className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors group"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">添加角色</span>
              </button>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* 外观设置 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">外观</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: '浅色', icon: Sun },
                  { value: 'dark', label: '深色', icon: Moon },
                  { value: 'system', label: '跟随系统', icon: RefreshCw },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSettings({ ...settings, theme: value as 'light' | 'dark' | 'system' })}
                    className={`flex items-center justify-center p-3 rounded-lg border ${
                      settings.theme === value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 语言设置 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">语言</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'zh-CN', label: '简体中文' },
                  { value: 'en-US', label: 'English' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSettings({ ...settings, language: value as 'zh-CN' | 'en-US' })}
                    className={`flex items-center justify-center p-3 rounded-lg border ${
                      settings.language === value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Globe2 className="w-4 h-4 mr-2" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 快捷键设置 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">快捷键</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.shortcut}
                  onChange={(e) => setSettings({ ...settings, shortcut: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入快捷键"
                />
                <button className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700">
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 更新设置 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">更新</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">自动检查更新</div>
                  <div className="text-xs text-gray-500 mt-1">当有新版本时自动通知</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoUpdate}
                    onChange={(e) => setSettings({ ...settings, autoUpdate: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <button className="w-full flex items-center justify-center px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <RefreshCw className="w-4 h-4 mr-2" />
                检查更新
              </button>
            </div>
          </div>
        );
    }
  };

  const content = (
    <div className="flex h-full">
      {/* 左侧导航栏 - 固定不滚动 */}
      <div className="w-48 flex-shrink-0 border-r border-gray-200 p-4">
        <nav className="space-y-1">
          {[
            { id: 'general', label: '通用设置' },
            { id: 'models', label: '模型管理' },
            { id: 'roles', label: '角色管理' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右侧内容区 - 可滚动 */}
      <div className="flex-1 min-w-0">
        <div className="h-full p-6 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="bg-white w-full h-full rounded-lg">{content}</div>;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-lg shadow-xl">
        {content}
      </div>
    </div>
  );
}
