import { Message } from "@/model/types/chatModel";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BotManager } from "@/bot/BotManger";
import { ChatHistory, HistoryMessage } from "@/model/text/HistoryMessage";
import { useEffect, useState } from "react";
import { TbClock, TbMessageCircle, TbTrash } from "react-icons/tb";
import { MessageItem } from "../main/components/MessageItem";
import { Page } from "@/utils/PageRouter";
import { ChatManager } from "./ChatManager";
import { Bot } from "@/bot/Bot";
export const HistoryPage = () => {
  const history = ChatHistory.use();
  const [current, setCurrent] = useState<string>("");
  const [selectedHistory, setSelectedHistory] = useState<{
    bot?: string;
    system: Message;
    list: Message[];
  } | null>(null);

  useEffect(() => {
    if (current) {
      setSelectedHistory(history[current]);
    }
  }, [history, current]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="History"
        close={() => {
          Page.to("main");
        }}
      />
      <div className="flex-1 overflow-hidden flex p-2">
        {/* 左侧历史列表 */}
        {/* 左侧历史列表 */}
        <div className="h-full overflow-y-auto w-[300px] p-4 bg-muted/50 rounded-lg min-w-[300px] max-w-[300px] space-y-2">
          <Button
            variant="destructive"
            onClick={() => {
              HistoryMessage.clearAll();
            }}
          >
            <TbTrash className="h-4 w-4" />
            delete all
          </Button>
          {Object.entries(history)
            .sort(
              (a, b) =>
                new Date(b[1].system.created_at).getTime() -
                new Date(a[1].system.created_at).getTime(),
            )
            .map(([key, value]) => (
              <div
                key={key}
                onClick={() => {
                  setCurrent(key);
                }}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-colors group",
                  "hover:bg-muted/50",
                  selectedHistory === value && "bg-muted/50 border-primary/50",
                )}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TbClock className="h-4 w-4" />
                    <span className="text-xs">
                      {new Date(value.system.created_at).toLocaleString(
                        "zh-CN",
                        {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      HistoryMessage.deleteHistory(key);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TbTrash className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="text-xs my-1 font-medium line-clamp-2 ">
                  {value.list[0]?.content}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TbMessageCircle className="h-3.5 w-3.5" />
                  <span>{value.list.length} messages</span>
                </div>
              </div>
            ))}
        </div>

        {/* 右侧对话详情 */}
        <div className="flex-1 h-full overflow-y-auto">
          {selectedHistory ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">
                  {BotManager.get(selectedHistory.bot || "")?.name}
                </h2>
                <Button
                  onClick={async () => {
                    const bot = await Bot.get(selectedHistory.bot || "");
                    bot.model.historyMessage.setList(selectedHistory.list);
                    console.log(bot.model.historyMessage.getList());
                    if (bot) {
                      ChatManager.setCurrentBot(bot);
                      Page.to("main");
                      ChatManager.setActive(true);
                    }
                  }}
                  variant="outline"
                >
                  continue
                </Button>
              </div>
              <div className="space-y-4">
                <div className="p-4 text-xs rounded-lg bg-primary/10">
                  {selectedHistory.system.content}
                </div>
                {selectedHistory.list.map((message, index) => (
                  <MessageItem key={index} message={message} />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TbMessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>选择一个对话查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
