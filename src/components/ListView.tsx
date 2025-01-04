import { Bot, ChevronRight, MessageSquare, Terminal } from "lucide-react";
import { ListItem } from "../types";

interface ListViewProps {
  items: ListItem[];
  activeIndex: number;
  onItemClick: (item: ListItem) => void;
}

export function ListView({ items, activeIndex, onItemClick }: ListViewProps) {
  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        if (item.type === "chat") {
          return (
            <div
              key="chat-action"
              onClick={() => onItemClick(item)}
              className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
                index === activeIndex ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${
                    index === activeIndex ? "text-blue-500" : "text-gray-400"
                  }`}
                >
                  <MessageSquare className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      index === activeIndex ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    发送消息
                  </div>
                  <div className="text-xs text-gray-400">{item.content}</div>
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
            onClick={() => onItemClick(item)}
            className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
              index === activeIndex ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`transition-colors ${
                  index === activeIndex ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {item.type === "agent" ? <Terminal /> : <Bot />}
              </div>
              <div>
                <div
                  className={`text-sm ${
                    index === activeIndex ? "text-blue-600" : "text-gray-600"
                  }`}
                >
                  {item.name}
                </div>
                <div className="text-xs text-gray-400 text-ellipsis overflow-hidden line-clamp-1">
                  {item.type === "agent"
                    ? item.description || "无描述"
                    : item.systemPrompt}
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                index === activeIndex ? "text-blue-400" : "text-gray-300"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
} 