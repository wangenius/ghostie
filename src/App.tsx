import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MessageSquare,
  Search,
  Languages,
  PenTool,
  Video,
  MoreHorizontal,
  Mic,
  Command,
  ChevronRight,
  Settings,
} from "lucide-react";

function App() {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocus = () => inputRef.current?.focus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        inputRef.current?.focus();
      }
    };

    inputRef.current?.focus();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const features = [
    { id: "chat", icon: <MessageSquare />, name: "问问豆包", hasArrow: true },
    { id: "search", icon: <Search />, name: "AI 搜索" },
    { id: "translate", icon: <Languages />, name: "翻译" },
    { id: "write", icon: <PenTool />, name: "帮我写作" },
    { id: "meeting", icon: <Video />, name: "会议记录" },
    { id: "more", icon: <MoreHorizontal />, name: "更多 AI 技能" },
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 搜索区域 */}
      <div className="pt-2 px-4">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <img
              src="/icon.png"
              alt="logo"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5"
            />

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full pl-8 text-sm pr-24 h-10 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
              placeholder="AI 搜索、提问或打开应用"
            />

            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95">
                <Mic className="w-[18px] h-[18px]" />
              </button>
              <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95">
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="flex-1 px-6 mt-6">
        <div className="max-w-xl mx-auto space-y-1">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  {feature.icon}
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-800">
                  {feature.name}
                </span>
              </div>
              {feature.hasArrow && (
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
