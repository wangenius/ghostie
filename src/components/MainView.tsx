import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { ChatManager } from "../services/ChatManager";
import { SettingsTab, View } from "../types";
import { ChatView } from "./ChatView";
import { HistoryView } from "./HistoryView";
import { ListView } from "./ListView";
import { SearchBar } from "./SearchBar";
import { SettingsView } from "./SettingsView";

export function MainView() {
  const [inputValue, setInputValue] = useState("");
  const [currentView, setCurrentView] = useState<View>("list");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading } = ChatManager.use();



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
        // clearMessages();
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

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
      unlistenChatComplete.then((fn) => fn());
    };
  }, []);



  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <SearchBar
        inputValue={inputValue}
        currentView={currentView}
        isLoading={loading}
        inputRef={inputRef}
        onInputChange={setInputValue}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === "list") {
            // clearMessages();
          }
        }}
        settingsTab={settingsTab}
        onSettingsTabChange={setSettingsTab}
      />

      <div className="flex-1 mt-2 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-6">
          {currentView === "list" && <ListView />}
          {currentView === "chat" && <ChatView />}
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
