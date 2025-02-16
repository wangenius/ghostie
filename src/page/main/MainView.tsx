import { BotProps } from "@/common/types/bot";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Bot } from "@/services/bot/Bot";
import { BotManager } from "@/services/bot/BotManger";
import { ChatManager } from "@/services/model/ChatManager";
import { ChatHistory } from "@/services/model/HistoryMessage";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { cmd } from "@utils/shell";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { TbArrowBigLeft, TbDots, TbHistory, TbLoader2, TbSettings } from "react-icons/tb";
import { HistoryPage } from "../history/HistoryPage";
import { BotItem } from "./components/BotItem";
import { MessageItem } from "./components/MessageItem";

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
        endChat
    } = ChatManager.useChat();

    const [selectedBotIndex, setSelectedBotIndex] = useState(0);
    const bots = BotManager.use();
    const botList = Object.values(bots);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        // 打开设置
        if (e.ctrlKey && e.key === ",") {
            e.preventDefault();
            cmd.open("settings", {}, { width: 800, height: 600 });
            return;
        }

        // 发送消息
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const trimmedInput = currentInput.trim();
            if (!trimmedInput) return;
            updateInput("");
            /* 开始聊天 */
            if (!isActive) {
                /* 选择助手 */
                const selectedBot = botList[selectedBotIndex];
                /* 开始聊天 */
                const bot = startChat(selectedBot);
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
    }, [currentInput, isActive, selectedBotIndex, botList, currentBot]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // 聚焦输入框
            if (e.ctrlKey && e.key.toLowerCase() === "i") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.ctrlKey && e.key.toLowerCase() === "h") {
                e.preventDefault();
                HistoryPage.open();
            }
            if (e.ctrlKey && e.key.toLowerCase() === "o") {
                e.preventDefault();
                endChat();
            }

            // 选择助手
            if (!isActive && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                const newIndex = e.key === "ArrowUp"
                    ? (selectedBotIndex - 1 + botList.length) % botList.length
                    : (selectedBotIndex + 1) % botList.length;
                setSelectedBotIndex(newIndex);
            }
        };

        document.addEventListener("keydown", handleGlobalKeyDown);
        return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isActive, selectedBotIndex, botList.length, endChat]);

    return (
        <div className="flex flex-col h-screen bg-background">
            <MemoizedHeader
                inputRef={inputRef}
                currentInput={currentInput}
                isLoading={isLoading}
                isActive={isActive}
                currentBot={currentBot}
                botList={botList}
                selectedBotIndex={selectedBotIndex}
                onInputChange={updateInput}
                onKeyDown={handleKeyDown}
                onEndChat={endChat}
                onSelectBot={setSelectedBotIndex}
            />
            <main className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto pb-4">
                    {!isActive &&
                        <MemoizedBotList
                            botList={botList}
                            selectedIndex={selectedBotIndex}
                            currentInput={currentInput}
                            onSelectBot={setSelectedBotIndex}
                            onStartChat={startChat}
                        />
                    }
                    {
                        isActive && currentBot && (
                            <MemoizedChatBox currentBot={currentBot} onEndChat={endChat} />
                        )
                    }
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
    selectedBotIndex: number;
    onInputChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onEndChat: () => void;
    onSelectBot: (index: number) => void;
}

const Header = memo(function Header({
    inputRef,
    currentInput,
    isLoading,
    isActive,
    currentBot,
    botList,
    selectedBotIndex,
    onInputChange,
    onKeyDown,
    onEndChat,
}: HeaderProps) {
    const handleSettingsClick = useCallback(() => {
        cmd.open("settings", {}, { width: 800, height: 600 });
    }, []);

    const handleHistoryClick = useCallback(() => {
        HistoryPage.open();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onInputChange(e.target.value);
    }, [onInputChange]);

    const handleActionClick = useCallback(() => {
        if (isActive) {
            if (isLoading) {
                currentBot?.model.stop();
            } else {
                onEndChat();
            }
        }
    }, [isActive, isLoading, currentBot, onEndChat]);



    return (
        <div className="px-4 draggable">
            <div className="mx-auto flex items-center h-14">
                <Button variant="ghost" className="p-1.5 bg-muted">
                    <LogoIcon className="w-4 h-4" />
                    {botList[selectedBotIndex].name}
                </Button>
                <div className="flex-1 pl-2">
                    <Input
                        ref={inputRef}
                        value={currentInput}
                        variant="ghost"
                        onChange={handleInputChange}
                        onKeyDown={onKeyDown}
                        className="text-sm"
                        placeholder={"点击此处输入内容"}
                    />
                </div>
                {
                    isActive && (
                        <Button onClick={handleActionClick} size="icon">
                            {
                                isLoading ? (
                                    <TbLoader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <TbArrowBigLeft className="h-4 w-4" />
                                )
                            }
                        </Button>
                    )
                }
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                            <TbDots className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="flex items-center gap-2" onClick={handleHistoryClick}>
                            <TbHistory className="h-4 w-4" />
                            历史记录
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2" onClick={handleSettingsClick}>
                            <TbSettings className="h-4 w-4" />
                            设置
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});

interface BotListProps {
    botList: BotProps[];
    selectedIndex: number;
    currentInput: string;
    onSelectBot: (index: number) => void;
    onStartChat: (bot: BotProps) => void;
}

const BotList = memo(function BotList({
    botList,
    selectedIndex,
    currentInput,
    onSelectBot,
    onStartChat
}: BotListProps) {
    const handleBotClick = useCallback((bot: BotProps, index: number) => {
        const trimmedInput = currentInput.trim();
        if (trimmedInput) {
            onStartChat(bot);
        } else {
            onSelectBot(index);
        }
    }, [currentInput, onStartChat, onSelectBot]);

    return (
        <div className="container mx-auto px-4 max-w-2xl space-y-1">
            {botList.map((bot, index) => (
                <BotItem
                    key={bot.name}
                    bot={bot}
                    isSelected={index === selectedIndex}
                    onClick={() => handleBotClick(bot, index)}
                />
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

