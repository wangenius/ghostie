import { Bot as BotIcon, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Bot, BotManager } from "../services/BotManger";
import { ChatManager } from "../services/ChatManager";


export function ListView() {
  const { list, current } = BotManager.use();
  useEffect(() => {
    ChatManager.createChat();
  }, []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = list.findIndex((item) => item.name === current);
      const newIndex = e.key === "ArrowUp"
        ? Math.max(0, currentIndex - 1)
        : e.key === "ArrowDown"
          ? Math.min(list.length - 1, currentIndex + 1)
          : currentIndex;

      if (newIndex !== currentIndex) {
        BotManager.setCurrent(list[newIndex].name);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [list, current]);

  const handleItemClick = (item: Bot) => {
    BotManager.setCurrent(item.name);
  };

  return (
    <div className="space-y-1 px-3">
      {list.map((item) => {
        const isActive = item.name === current;
        return (
          <div
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={`flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer transition-colors ${isActive ? "bg-secondary" : "hover:bg-secondary"
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                <BotIcon />
              </div>
              <div>
                <div
                  className={`text-sm ${isActive ? "text-primary" : "text-foreground"
                    }`}
                >
                  {item.name}
                </div>
                <div className="text-xs text-muted-foreground text-ellipsis overflow-hidden line-clamp-1">
                  {item.system_prompt || "无描述"}
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 flex-none ${isActive ? "text-primary" : "text-muted-foreground"
                }`}
            />
          </div>
        );
      })}
    </div>
  );
} 