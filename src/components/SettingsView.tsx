import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { Plus, Trash2, Moon, Sun, Globe2, Keyboard, RefreshCw, Settings as SettingsIcon, Database, Users2, X, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

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

const NAV_ITEMS = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'models', label: '模型', icon: Database },
  { id: 'roles', label: '角色', icon: Users2 },
] as const;

export function SettingsView({ isOpen, onClose, embedded = false }: Props) {
  const [activeTab, setActiveTab] = useState<"models" | "roles" | "general">("general");
  const [models, setModels] = useState<Model[]>([]);
  const [settings, setSettings] = useState<Settings>({
    theme: 'system',
    language: 'zh-CN',
    shortcut: 'Ctrl+Shift+Space',
    autoUpdate: true,
  });

  useEffect(() => {
    loadModels();

    // 监听模型更新事件
    const unsubscribe = listen("model-updated", () => {
      loadModels();
    });

    return () => {
      unsubscribe.then(fn => fn());
    };
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
          api_key: "",
        })).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  };

  const handleOpenModelAdd = async () => {
    await invoke("open_model_add");
  };

  const handleOpenRoleAdd = async () => {
    await invoke("open_role_add");
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
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.name}
                onClick={() => !model.is_current && handleSetCurrentModel(model.name)}
                className={`flex items-center justify-between h-14 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
                  model.is_current ? "bg-blue-50" : "hover:bg-gray-50"
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
                      handleDeleteModel(model.name);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleOpenModelAdd}
              className="flex items-center justify-between w-full h-12 px-3 -mx-3 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-[18px] h-[18px]" />
                <span className="text-sm">添加模型</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        );
      case "roles":
        return (
          <div className="space-y-2">
            <button
              onClick={handleOpenRoleAdd}
              className="flex items-center justify-between w-full h-12 px-3 -mx-3 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-[18px] h-[18px]" />
                <span className="text-sm">添加角色</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <div
              onClick={() => setSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })}
              className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  {settings.theme === 'light' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </div>
                <div>
                  <div className="text-sm text-gray-600">外观</div>
                  <div className="text-xs text-gray-400">{settings.theme === 'light' ? '浅色模式' : '深色模式'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>

            <div
              onClick={() => setSettings({ ...settings, language: settings.language === 'zh-CN' ? 'en-US' : 'zh-CN' })}
              className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <Globe2 className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">语言</div>
                  <div className="text-xs text-gray-400">{settings.language === 'zh-CN' ? '简体中文' : 'English'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <Keyboard className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">快捷键</div>
                  <div className="text-xs text-gray-400">{settings.shortcut}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <RefreshCw className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">自动更新</div>
                  <div className="text-xs text-gray-400">当有新版本时自动通知</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoUpdate}
                  onChange={(e) => setSettings({ ...settings, autoUpdate: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-gray-200 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>
          </div>
        );
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-14 px-6 border-b border-gray-100">
        <nav className="flex items-center space-x-6">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 text-sm transition-colors ${
                activeTab === id
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        {!embedded && (
          <button
            onClick={onClose}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none opacity-0'}`}>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[50%] z-[90] max-w-xl translate-y-[-50%] mx-auto">
        <div className="relative bg-white rounded-xl shadow-2xl">
          <div className="h-[85vh] overflow-hidden">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
