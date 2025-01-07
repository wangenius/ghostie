import { ArrowLeft, Bot, Clock, Database, Loader2Icon, Settings as SettingsIcon, Stars, SwatchBook, Users, X } from "lucide-react";
import { RefObject } from "react";
import { BotManager } from "../services/BotManger";
import { ChatManager } from "../services/ChatManager";
import { SettingsTab, View } from "../types";


interface Props {
  inputValue: string;
  currentView: View;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onViewChange: (view: View) => void;
  settingsTab?: SettingsTab;
  onSettingsTabChange?: (tab: SettingsTab) => void;
}

const SETTINGS_NAV_ITEMS = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'models', label: '模型', icon: Database },
  { id: 'bots', label: '机器人', icon: Bot },
  { id: 'agents', label: '代理', icon: Users },
  { id: 'plugins', label: '插件', icon: SwatchBook },
] as const;

export function SearchBar({
  inputValue,
  currentView,
  isLoading,
  inputRef,
  onInputChange,
  onViewChange,
  settingsTab,
  onSettingsTabChange,
}: Props) {
  const { current } = BotManager.use();

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputValue.trim()) return;
      if (!current) {
        alert("请先选择一个机器人");
        return;
      }

      if (!ChatManager.state.current.currentId) {
        await ChatManager.createChat();
      }

      try {
        onViewChange("chat");
        onInputChange("");
        await ChatManager.sendMessage(inputValue, current);
      } catch (error) {
        console.error("发送消息失败:", error);
      }
    }
  };

  return (
    <div data-tauri-drag-region className="pt-2 px-4">
      <div data-tauri-drag-region className="flex items-center gap-2 h-10">
        {currentView !== "list" ? (
          <button
            onClick={() => onViewChange("list")}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        ) : current ? (
          <div data-tauri-drag-region className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-primary/10">
            <Bot data-tauri-drag-region className="w-4 h-4 text-primary" />
            <span data-tauri-drag-region className="text-xs font-medium text-primary">{current}</span>
          </div>
        ) : (
          <div data-tauri-drag-region>
            <Stars data-tauri-drag-region className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {currentView === "settings" ? (
          <div className="flex items-center gap-2 flex-1">
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
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm h-10 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={current ? `使用 ${current} 对话...` : "输入消息..."}
            />

          </div>
        ) : (
          <div className="flex-1 text-foreground">
            {currentView === "history" ? "历史记录" : null}
          </div>
        )}

        <div className="flex items-center gap-2">
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
