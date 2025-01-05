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
  const { bots, agents, loadBots, loadAgents, setCurrentBot } = useBots();

  useEffect(() => {
    if (currentView === "list") {
      loadBots();
    }
  }, [currentView]);

  // 计算当前显示的列表项
  const listItems: ListItem[] = (() => {
    if (inputValue.trim()) {
      const chatItem = {
        type: "chat" as const,
        content: inputValue,
      };

      const filteredItems = [...bots, ...agents].filter(
        (item) =>
          item.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          item.systemPrompt.toLowerCase().includes(inputValue.toLowerCase()) ||
          ("description" in item &&
            item.description?.toLowerCase().includes(inputValue.toLowerCase()))
      );

      return [chatItem, ...filteredItems];
    }

    return [...bots, ...agents].sort((a, b) => a.name.localeCompare(b.name));
  })();

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
  }, [inputValue]);

  const handleItemClick = async (item: ListItem) => {
    if (item.type === "chat") {
      await handleChat(item.content);
    } else if (item.type === "bot") {
      await handleBotClick(item);
    }
  };

  const handleBotClick = async (bot: BotInfo) => {
    if (!bot.isCurrent) {
      await setCurrentBot(bot.name);
    }
  };

  const handleChat = async (message: string) => {
    setInputValue("");
    setCurrentView("chat");
    await sendMessage(message);
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
      if (activeItem) {
        await handleItemClick(activeItem);
      }
    }
  };

  return (
    <div className="app-container flex flex-col h-screen bg-white">
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

      <div className="flex-1 px-6 mt-2 overflow-y-auto">
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
