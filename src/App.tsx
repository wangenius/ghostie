import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  MessageSquare,
  Plus,
  Settings,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RoleAdd } from "./components/RoleAdd";
import { SettingsDialog } from "./components/SettingsDialog";

interface BotInfo {
  name: string;
  isCurrent: boolean;
  systemPrompt: string;
  type: "bot";
}

interface AgentInfo {
  name: string;
  description: string | null;
  systemPrompt: string;
  env: Record<string, string>;
  templates: Record<string, string>;
  type: "agent";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type View = "list" | "new-bot" | "settings" | "chat";
type ListItem = BotInfo | AgentInfo | { type: "chat"; content: string };

function App() {
  const [inputValue, setInputValue] = useState("");
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [currentView, setCurrentView] = useState<View>("list");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageRef = useRef<string>("");

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

    return [...bots, ...agents];
  })();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        setCurrentView("list");
        setMessages([]);
      }
    };

    // 监听流式响应
    const unlisten = listen("chat-response", (event) => {
      const chunk = event.payload as string;
      console.log(chunk);
      setMessages((messages) => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant") {
          return [
            ...messages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + chunk },
          ];
        }
        return [...messages, { role: "assistant", content: chunk }];
      });
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
      unlisten.then((fn) => fn()); // 清理事件监听器
    };
  }, []);

  // 重置 activeIndex 当列表内容变化时
  useEffect(() => {
    setActiveIndex(0);
  }, [inputValue]);

  const loadBots = async () => {
    try {
      const botsList = await invoke<[string, boolean, string][]>("list_bots");
      setBots(
        botsList.map(([name, isCurrent, systemPrompt]) => ({
          name,
          isCurrent,
          systemPrompt,
          type: "bot" as const,
        }))
      );
    } catch (error) {
      console.error("加载 bots 失败:", error);
    }
  };

  const loadAgents = async () => {
    try {
      const agentsList = await invoke<AgentInfo[]>("list_agents");
      setAgents(
        agentsList.map((agent) => ({ ...agent, type: "agent" as const }))
      );
    } catch (error) {
      console.error("加载 agents 失败:", error);
    }
  };

  const handleBotClick = async (bot: BotInfo) => {
    if (!bot.isCurrent) {
      try {
        await invoke("set_current_bot", { name: bot.name });
        await loadBots();
      } catch (error) {
        console.error("设置当前 bot 失败:", error);
      }
    }
  };

  const handleChat = async (message: string) => {
    setInputValue("");
    setIsLoading(true);
    setCurrentView("chat");

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await invoke("chat", {
        messages: [userMessage],
      });
    } catch (error) {
      console.error("发送消息失败:", error);
    } finally {
      setIsLoading(false);
    }
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
      if (!activeItem) return;

      if (activeItem.type === "chat") {
        await handleChat(inputValue.trim());
      } else if (activeItem.type === "bot") {
        await handleBotClick(activeItem);
      } else if (activeItem.type === "agent") {
        // 处理 agent 点击
        console.log("Agent clicked:", activeItem.name);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 搜索区域 */}
      <div className="pt-2 px-4">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            {currentView !== "list" ? (
              <button
                onClick={() => {
                  setCurrentView("list");
                  setMessages([]);
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            ) : (
              <button className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={"/icon.png"} alt="logo" className="w-5 h-5" />
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full text-sm h-10 bg-transparent text-gray-800 outline-none placeholder:text-gray-400 ${
                currentView !== "list" ? "pl-8" : "pl-8"
              } pr-24`}
              placeholder="AI 搜索、提问或打开应用"
              disabled={isLoading}
            />

            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isLoading && (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              )}
              <button
                onClick={() =>
                  setCurrentView(currentView === "new-bot" ? "list" : "new-bot")
                }
                className={`p-1.5 rounded-md transition-all duration-200 active:scale-95 ${
                  currentView === "new-bot"
                    ? "bg-blue-50 text-blue-600"
                    : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                }`}
              >
                <Plus className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() =>
                  setCurrentView(
                    currentView === "settings" ? "list" : "settings"
                  )
                }
                className={`p-1.5 rounded-md transition-all duration-200 active:scale-95 ${
                  currentView === "settings"
                    ? "bg-blue-50 text-blue-600"
                    : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                }`}
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 px-6 mt-6 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-6">
          {currentView === "list" && (
            <div className="space-y-1">
              {listItems.map((item, index) => {
                if (item.type === "chat") {
                  return (
                    <div
                      key="chat-action"
                      onClick={() => handleChat(item.content)}
                      className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
                        index === activeIndex
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`${
                            index === activeIndex
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        >
                          <MessageSquare className="w-[18px] h-[18px]" />
                        </div>
                        <div>
                          <div
                            className={`text-sm ${
                              index === activeIndex
                                ? "text-blue-600"
                                : "text-gray-600"
                            }`}
                          >
                            发送消息
                          </div>
                          <div className="text-xs text-gray-400">
                            {item.content}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded">
                        Enter ↵
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      if (item.type === "bot") {
                        handleBotClick(item);
                      }
                    }}
                    className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
                      index === activeIndex ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`transition-colors ${
                          index === activeIndex
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      >
                        {item.type === "agent" ? <Terminal /> : <Bot />}
                      </div>
                      <div>
                        <div
                          className={`text-sm ${
                            index === activeIndex
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.type === "agent"
                            ? item.description || "无描述"
                            : item.systemPrompt}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        index === activeIndex
                          ? "text-blue-400"
                          : "text-gray-300"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {currentView === "chat" && (
            <div className="space-y-4 mb-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "assistant"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "assistant"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {currentView === "new-bot" && (
            <RoleAdd
              isOpen={true}
              onClose={() => setCurrentView("list")}
              onSuccess={() => {
                loadBots();
                setCurrentView("list");
              }}
              embedded={true}
            />
          )}

          {currentView === "settings" && (
            <SettingsDialog
              isOpen={true}
              onClose={() => setCurrentView("list")}
              embedded={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
