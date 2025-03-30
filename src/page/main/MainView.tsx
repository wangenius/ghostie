import { Bot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { BotProps } from "@/common/types/bot";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChatManager } from "@/model/ChatManager";
import { ChatHistory } from "@/model/HistoryMessage";
import { SettingsManager } from "@/settings/SettingsManager";
import { Page } from "@/utils/PageRouter";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TbArrowBigLeft,
  TbClockDown,
  TbDots,
  TbFileUpload,
  TbHeartDown,
  TbHistory,
  TbLoader2,
  TbPaperclip,
  TbPhotoUp,
  TbSettings,
  TbSortDescending2,
} from "react-icons/tb";
import { BotItem } from "./components/BotItem";
import { MessageItem } from "./components/MessageItem";

type SortType = "default" | "mostUsed" | "recentUsed";

/* 主界面 */
export function MainView() {
  const {
    isActive,
    currentInput,
    isLoading,
    currentBot,
    updateInput,
    setLoading,
    startChat,
    endChat,
  } = ChatManager.useChat();

  const bots = BotManager.use();
  const botList = Object.values(bots);
  const [selectedBotId, setSelectedBotId] = useState<string>(
    () => botList[0]?.id || "",
  );
  const sortType = SettingsManager.use((state) => state.sortType);
  const inputRef = useRef<HTMLInputElement>(null);

  // 计算综合得分
  const calculateScore = useCallback((bot: BotProps) => {
    if (!bot.lastUsed) return 0;
    const now = Date.now();
    const daysSinceLastUse = (now - bot.lastUsed) / (1000 * 60 * 60 * 24);
    const usageScore = (bot.usageCount || 0) * 100;
    const recencyScore = Math.max(0, 100 - Math.min(daysSinceLastUse, 100));
    return usageScore + recencyScore;
  }, []);

  // 对机器人列表进行排序
  const sortedBots = useMemo(() => {
    const list = [...botList];

    return list.sort((a, b) => {
      // 处理置顶状态
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      // 根据排序类型处理
      switch (sortType) {
        case "mostUsed": {
          const usageA = a.usageCount || 0;
          const usageB = b.usageCount || 0;
          if (usageA !== usageB) {
            return usageB - usageA;
          }
          // 使用次数相同时，按最近使用时间排序
          return (b.lastUsed || 0) - (a.lastUsed || 0);
        }
        case "recentUsed": {
          const timeA = a.lastUsed || 0;
          const timeB = b.lastUsed || 0;
          return timeB - timeA;
        }
        default: {
          // 默认综合排序
          const scoreA = calculateScore(a);
          const scoreB = calculateScore(b);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          // 分数相同时，按最近使用时间排序
          return (b.lastUsed || 0) - (a.lastUsed || 0);
        }
      }
    });
  }, [botList, sortType, calculateScore]);

  // 使用useMemo缓存selectedBot
  const selectedBot = useMemo(
    () => sortedBots.find((bot) => bot.id === selectedBotId) || sortedBots[0],
    [sortedBots, selectedBotId],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 发送消息
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmedInput = currentInput.trim();
        if (!trimmedInput) return;
        updateInput("");
        /* 开始聊天 */
        if (!isActive) {
          /* 记录使用历史 */
          BotManager.recordUsage(selectedBot.id);
          /* 开始聊天 */
          const bot = await startChat(selectedBot);
          /* 设置加载状态 */
          setLoading(true);
          try {
            await bot.chat(trimmedInput);
          } finally {
            setLoading(false);
          }
        } else if (currentBot) {
          setLoading(true);
          try {
            await currentBot.chat(trimmedInput);
          } finally {
            setLoading(false);
          }
        }
      }
    },
    [
      currentInput,
      isActive,
      selectedBot,
      currentBot,
      startChat,
      updateInput,
      setLoading,
    ],
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 聚焦输入框
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        Page.to("history");
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        endChat();
      }
      // 打开设置
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        Page.to("settings");
        return;
      }
      // 选择助手
      if (!isActive && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const currentIndex = sortedBots.findIndex(
          (bot) => bot.id === selectedBotId,
        );
        const newIndex =
          e.key === "ArrowUp"
            ? (currentIndex - 1 + sortedBots.length) % sortedBots.length
            : (currentIndex + 1) % sortedBots.length;
        setSelectedBotId(sortedBots[newIndex].id);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isActive, selectedBotId, sortedBots.length, endChat]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <MemoizedHeader
        inputRef={inputRef}
        currentInput={currentInput}
        isLoading={isLoading}
        isActive={isActive}
        currentBot={currentBot}
        botList={sortedBots}
        selectedBotId={selectedBotId}
        onInputChange={updateInput}
        onKeyDown={handleKeyDown}
        onEndChat={endChat}
        onSelectBot={setSelectedBotId}
      />
      <main className="flex-1 overflow-hidden pb-4">
        <div className="h-full overflow-y-auto">
          {!isActive && (
            <MemoizedBotList
              botList={sortedBots}
              selectedBotId={selectedBotId}
              currentInput={currentInput}
              onSelectBot={setSelectedBotId}
              onStartChat={startChat}
            />
          )}
          {isActive && currentBot && (
            <MemoizedChatBox currentBot={currentBot} onEndChat={endChat} />
          )}
        </div>
      </main>
    </div>
  );
}

interface HeaderProps {
  inputRef: React.RefObject<HTMLInputElement>;
  currentInput: string;
  isLoading: boolean;
  isActive: boolean;
  currentBot?: Bot;
  botList: BotProps[];
  selectedBotId: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onEndChat: () => void;
  onSelectBot: (id: string) => void;
}

const Header = memo(function Header({
  inputRef,
  currentInput,
  isLoading,
  isActive,
  currentBot,
  botList,
  selectedBotId,
  onInputChange,
  onKeyDown,
  onEndChat,
}: HeaderProps) {
  const sortType = SettingsManager.use((state) => state.sortType);
  const handleSettingsClick = useCallback(() => {
    Page.to("settings");
  }, []);

  const handleHistoryClick = useCallback(() => {
    Page.to("history");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e.target.value);
    },
    [onInputChange],
  );

  const handleActionClick = useCallback(() => {
    if (isActive) {
      if (isLoading) {
        currentBot?.stop();
      } else {
        onEndChat();
      }
    }
  }, [isActive, isLoading, currentBot, onEndChat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (isActive && isLoading) {
          currentBot?.stop();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isLoading, currentBot, onEndChat]);

  return (
    <div className="px-3 draggable">
      <div className="mx-auto flex items-center h-12">
        <div className="p-1.5 bg-muted rounded-md flex items-center gap-2 text-xs hover:bg-muted-foreground/15 transition-colors">
          <LogoIcon className="w-4 h-4" />
          {botList.find((bot) => bot.id === selectedBotId)?.name ||
            botList[0]?.name}
        </div>
        <div className="flex-1 pl-2">
          <Input
            ref={inputRef}
            value={currentInput}
            variant="ghost"
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            className="text-[13px]"
            placeholder={"Type here..."}
          />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-xs">
                <TbPaperclip className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <TbFileUpload className="w-4 h-4" />
                File
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TbPhotoUp className="w-4 h-4" />
                Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isActive && (
            <div className="">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-xs">
                    {sortType === "default" && (
                      <TbSortDescending2 className="w-4 h-4 mr-0.5" />
                    )}
                    {sortType === "mostUsed" && (
                      <TbHeartDown className="w-4 h-4 mr-0.5" />
                    )}
                    {sortType === "recentUsed" && (
                      <TbClockDown className="w-4 h-4 mr-0.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={sortType}
                    onValueChange={(value) =>
                      SettingsManager.setSortType(value as SortType)
                    }
                  >
                    <DropdownMenuRadioItem value="default">
                      Default
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="mostUsed">
                      Most Used
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="recentUsed">
                      Recent Used
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {isActive && (
            <Button onClick={handleActionClick} size="icon">
              {isLoading ? (
                <TbLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TbArrowBigLeft className="h-4 w-4" />
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <TbDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleHistoryClick}
              >
                <TbHistory className="h-4 w-4" />
                History
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleSettingsClick}
              >
                <TbSettings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

interface BotListProps {
  botList: BotProps[];
  selectedBotId: string;
  currentInput: string;
  onSelectBot: (id: string) => void;
  onStartChat: (bot: BotProps) => void;
}

const BotList = memo(function BotList({
  botList,
  selectedBotId,
  currentInput,
  onSelectBot,
  onStartChat,
}: BotListProps) {
  const handleBotClick = useCallback(
    (bot: BotProps) => {
      const trimmedInput = currentInput.trim();
      if (trimmedInput) {
        onStartChat(bot);
      } else {
        onSelectBot(bot.id);
      }
    },
    [currentInput, onStartChat, onSelectBot],
  );

  // 添加ref用于滚动
  const selectedBotRef = useRef<HTMLDivElement>(null);

  // 当选中的bot改变时，确保其可见
  useEffect(() => {
    if (selectedBotRef.current) {
      selectedBotRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedBotId]);

  return (
    <div className="container mx-auto px-4 max-w-2xl space-y-1 overflow-y-auto">
      {botList.map((bot) => (
        <div
          key={bot.id}
          ref={bot.id === selectedBotId ? selectedBotRef : null}
        >
          <BotItem
            bot={bot}
            isSelected={bot.id === selectedBotId}
            onClick={() => handleBotClick(bot)}
          />
        </div>
      ))}
    </div>
  );
});

interface ChatBoxProps {
  currentBot: Bot;
  onEndChat: () => void;
}

const ChatBox = memo(function ChatBox({ currentBot, onEndChat }: ChatBoxProps) {
  const list = ChatHistory.use();
  const message = list[currentBot.model.historyMessage.id];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!message) {
    onEndChat();
    return null;
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list]);

  return (
    <div className="px-2 space-y-2 my-2">
      {message.list.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

const MemoizedHeader = memo(Header);
const MemoizedBotList = memo(BotList);
const MemoizedChatBox = memo(ChatBox);
