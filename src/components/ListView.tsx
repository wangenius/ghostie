import { Bot, ChevronRight, MessageSquare, Terminal } from "lucide-react";
import { ListItem } from "../types";
import { useBots } from "../hooks/useBots";

interface ListViewProps {
  items: ListItem[];
  activeIndex: number;
  onItemClick: (item: ListItem) => void;
}

export function ListView({ items, activeIndex, onItemClick }: ListViewProps) {
  const { bots } = useBots();
  const currentBot = bots.find(bot => bot.isCurrent);

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        if (item.type === "chat") {
          return (
            <div
              key="chat-action"
              onClick={() => onItemClick(item)}
              className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
                index === activeIndex ? "bg-primary/10" : "hover:bg-secondary"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${
                    index === activeIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      index === activeIndex ? "text-primary" : "text-foreground"
                    }`}
                  >
                    发送消息
                  </div>
                  <div className="text-xs text-muted-foreground">{item.content}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                Enter ↵
              </div>
            </div>
          );
        }

        const isCurrentBot = item.type === "bot" && currentBot && item.name === currentBot.name;

        return (
          <div
            key={item.name}
            onClick={() => onItemClick(item)}
            className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${
              index === activeIndex || isCurrentBot ? "bg-secondary" : "hover:bg-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`transition-colors ${
                  index === activeIndex || isCurrentBot ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.type === "agent" ? <Terminal /> : <Bot />}
              </div>
              <div>
                <div
                  className={`text-sm ${
                    index === activeIndex || isCurrentBot ? "text-primary" : "text-foreground"
                  }`}
                >
                  {item.name}
                  {isCurrentBot && <span className="ml-2 text-xs text-primary">(当前)</span>}
                </div>
                <div className="text-xs text-muted-foreground text-ellipsis overflow-hidden line-clamp-1">
                  {item.type === "agent"
                    ? item.description || "无描述"
                    : item.systemPrompt}
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 flex-none ${
                index === activeIndex || isCurrentBot ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
} 