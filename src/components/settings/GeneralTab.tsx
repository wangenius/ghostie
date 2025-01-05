import { ChevronRight, Globe2, Keyboard, Moon, RefreshCw, Sun } from "lucide-react";
import { useState } from "react";

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  shortcut: string;
  autoUpdate: boolean;
}

export function GeneralTab() {
  const [settings, setSettings] = useState<Settings>({
    theme: 'system',
    language: 'zh-CN',
    shortcut: 'Ctrl+Shift+Space',
    autoUpdate: true,
  });

  return (
    <div className="space-y-1">
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