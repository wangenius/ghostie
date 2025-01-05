import { useChat } from "../hooks/useChat";
import { BotInfo, ListItem, View } from "../types";
import { SearchBar } from "./SearchBar";
import { ListView } from "./ListView";
import { ChatView } from "./ChatView";
import { HistoryView } from "./HistoryView";
import { SettingsView } from "./SettingsView";
import { useState, useRef, useEffect } from "react";
import { useBots } from "../hooks/useBots";
import { listen } from "@tauri-apps/api/event";

export function MainView() {
	const [inputValue, setInputValue] = useState("");

  const [currentView, setCurrentView] = useState<View>("list");
  const [settingsTab, setSettingsTab] = useState<"general" | "models" | "bots">("general");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const { bots, agents, loadBots, loadAgents, updateRecentBot, recentBots } = useBots();

  useEffect(() => {
    if (currentView === "list") {
      loadBots();
    }
  }, [currentView]);

  // 计算当前显示的列表项
  const listItems: ListItem[] = [
    // 首先添加最近使用的 bots
    ...recentBots
      .map(name => bots.find(bot => bot.name === name))
      .filter((bot): bot is BotInfo => bot !== undefined),
    // 然后添加其他未在最近列表中的 bots
    ...bots.filter(bot => !recentBots.includes(bot.name)),
    // 最后添加 agents
    ...agents
  ];

  useEffect(() => {
    const handleFocus = () => inputRef.current?.focus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        inputRef.current?.focus();
      }
    };

    // 添加全局快捷键监听
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setCurrentView("history");
      } else if (e.ctrlKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "r")) {
        e.preventDefault();
        setCurrentView("list");
        inputRef.current?.focus();
        clearMessages();
      } else if (e.ctrlKey && e.key.toLowerCase() === "," || e.key.toLowerCase() === "，") {
        e.preventDefault();
        setCurrentView("settings");
      } else if (e.ctrlKey && (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "u" || e.key.toLowerCase() === "p" || e.key.toLowerCase() === "f" || e.key.toLowerCase() === "g")) {
        e.preventDefault();
      }
    };

    // 监听聊天完成事件
    const unlistenChatComplete = listen("chat-complete", () => {
      if (currentView === "chat") {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    });

    inputRef.current?.focus();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);

    loadBots();
    loadAgents();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
      unlistenChatComplete.then((fn) => fn());
    };
  }, []);

  // 重置 activeIndex 当列表内容变化时
  useEffect(() => {
    setActiveIndex(0);
  }, [currentView]);

  const handleItemClick = async (item: ListItem) => {
    if (item.type === "bot") {
      if (inputValue.trim()) {
        await handleChat(inputValue, item.name);
      } else {
        await handleBotClick(item);
      }
    }
  };

  const handleBotClick = async (bot: BotInfo) => {
    // 找到当前点击的 bot 在 listItems 中的索引
    const index = listItems.findIndex(item => item.type === "bot" && item.name === bot.name);
    if (index !== -1) {
      setActiveIndex(index);
    }
    await updateRecentBot(bot.name);
  };

  const handleChat = async (message: string, bot?: string) => {
    if (bot) {
      await updateRecentBot(bot);
    }
    setInputValue("");
    setCurrentView("chat");
    await sendMessage(message, bot);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(listItems.length - 1, prev + 1));
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const activeItem = listItems[activeIndex];
      if (activeItem?.type === "bot") {
        await handleItemClick(activeItem);
      }
    }
  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <SearchBar
        inputValue={inputValue}
        currentView={currentView}
        isLoading={isLoading}
        inputRef={inputRef}
        onInputChange={setInputValue}
        onKeyDown={handleKeyDown}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === "list") {
            clearMessages();
          }
        }}
        settingsTab={settingsTab}
        onSettingsTabChange={setSettingsTab}
      />

      <div className="flex-1 mt-2 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-6">
          {currentView === "list" && (
            <ListView
              items={listItems}
              activeIndex={activeIndex}
              onItemClick={handleItemClick}
            />
          )}

          {currentView === "chat" && <ChatView messages={messages} />}

          {currentView === "history" && <HistoryView />}

          {currentView === "settings" && (
            <SettingsView
              isOpen={true}
              onClose={() => setCurrentView("list")}
              embedded={true}
              activeTab={settingsTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}
