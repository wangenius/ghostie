import { ArrowLeft, Bot, Clock, Database, Loader2Icon, Settings as SettingsIcon, Stars, Users, X } from "lucide-react";
import { RefObject } from "react";
import { useBots } from "../hooks/useBots";
import { SettingsTab, View } from "../types";


interface Props {
  inputValue: string;
  currentView: View;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onViewChange: (view: View) => void;
  settingsTab?: SettingsTab;
  onSettingsTabChange?: (tab: SettingsTab) => void;
}

const SETTINGS_NAV_ITEMS = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'models', label: '模型', icon: Database },
  { id: 'bots', label: '机器人', icon: Bot },
  { id: 'agents', label: '代理', icon: Users },
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
  const { bots } = useBots();
  const currentBot = bots.find(bot => bot.isCurrent);

  return (
    <div className="pt-2 px-4">
      <div className="relative">
        {currentView !== "list" ? (
          <button
            onClick={() => onViewChange("list")}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        ) : (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2"
            data-tauri-drag-region
          >
            <Stars data-tauri-drag-region
              className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </div>
        )}

        {currentView === "settings" ? (
          <div className="w-full pl-8 h-10 flex items-center gap-2">
            {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onSettingsTabChange?.(id as any)}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-sm transition-colors ${settingsTab === id
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        ) : currentView === "chat" || currentView === "list" ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full pl-8 text-sm pr-24 h-10 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={currentBot ? `使用 ${currentBot.name} 对话...` : "输入消息..."}
            />
            {currentBot && currentView === "chat" && (
              <div className="absolute left-8 -bottom-5 text-xs text-muted-foreground">
                当前机器人: {currentBot.name}
              </div>
            )}
          </>
        ) : (
          <div className="w-full pl-8 h-10 text-foreground leading-10">
            {currentView === "history" ? "历史记录" : null}
          </div>
        )}

        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
            >
              <Loader2Icon className="w-[18px] h-[18px] animate-spin" />
            </button>
          )}

          {currentView !== "list" && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}

          {currentView === "list" && (
            <>
              <button
                onClick={() => onViewChange("history")}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
              >
                <Clock className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={() => onViewChange("settings")}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
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
