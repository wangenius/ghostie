import { ArrowLeft, Bot, Clock, Database, Loader2Icon, RefreshCw, Settings as SettingsIcon, X } from "lucide-react";
import { RefObject } from "react";
import { View } from "../types";

interface Props {
  inputValue: string;
  currentView: View;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onViewChange: (view: View) => void;
  settingsTab?: "general" | "models" | "bots";
  onSettingsTabChange?: (tab: "general" | "models" | "bots") => void;
}

const SETTINGS_NAV_ITEMS = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'models', label: '模型', icon: Database },
  { id: 'bots', label: '机器人', icon: Bot },
] as const;

export function SearchBar({
  inputValue,
  currentView,
  isLoading,
  inputRef,
  onInputChange,
  onKeyDown,
  onViewChange,
  settingsTab,
  onSettingsTabChange,
}: Props) {
  return (
    <div className="pt-2 px-4">
      <div className="relative">
        {currentView !== "list" ? (
          <button
            onClick={() => onViewChange("list")}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        ) : (
          <button className="absolute left-0 top-1/2 -translate-y-1/2">
            <img src={"/icon.png"} alt="logo" className="w-5 h-5" />
          </button>
        )}

        {currentView === "settings" ? (
          <div className="w-full pl-8 h-10 flex items-center gap-2">
            {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onSettingsTabChange?.(id as any)}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-sm transition-colors ${
                  settingsTab === id
                    ? 'text-blue-600 font-medium bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        ) : currentView === "chat" || currentView === "list" ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full pl-8 text-sm pr-24 h-10 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
            placeholder={"输入消息..."}
          />
        ) : (
          <div className="w-full pl-8 h-10 text-gray-600 leading-10">
            {currentView === "history" ? "历史记录" : null}
          </div>
        )}

        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <Loader2Icon className="w-[18px] h-[18px] animate-spin" />
            </button>
          )}

          {currentView !== "list" && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}

          {currentView === "list" && (
            <>
              <button
                onClick={() => onViewChange("history")}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
              >
                <Clock className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={() => onViewChange("settings")}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
              >
                <SettingsIcon className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
