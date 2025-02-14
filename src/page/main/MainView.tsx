import { BotProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot } from "@/services/bot/Bot";
import { BotManager } from "@/services/bot/BotManger";
import { ChatManager } from "@/services/model/ChatManager";
import { ChatHistory } from "@/services/model/HistoryMessage";
import { cmd } from "@utils/shell";
import { useEffect, useRef } from "react";
import { TbHistory, TbLoader2, TbSettings } from "react-icons/tb";
import { HistoryPage } from "../history/HistoryPage";
import { BotItem } from "./components/BotItem";
import { MessageItem } from "./components/MessageItem";

/* 主界面 */
export function MainView() {
    const {
        isActive,
        currentInput,
        isLoading,
        selectedBotIndex,
        currentBot,
        updateInput,
        setLoading,
        selectBot,
        startChat,
        endChat
    } = ChatManager.useChat();

    const bots = BotManager.use();
    const botList = Object.values(bots);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    };

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
                selectBot(newIndex);
            }
        };

        document.addEventListener("keydown", handleGlobalKeyDown);
        return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isActive, selectedBotIndex, botList.length]);

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header
                inputRef={inputRef}
                currentInput={currentInput}
                isLoading={isLoading}
                isActive={isActive}
                currentBot={currentBot}
                onInputChange={updateInput}
                onKeyDown={handleKeyDown}
                onEndChat={endChat}
            />
            <main className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {!isActive &&
                        <BotList
                            botList={botList}
                            selectedIndex={selectedBotIndex}
                            currentInput={currentInput}
                            onSelectBot={selectBot}
                            onStartChat={startChat}
                        />
                    }
                    {
                        isActive && currentBot && (
                            <ChatBox currentBot={currentBot} onEndChat={endChat} />
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
    onInputChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onEndChat: () => void;
}

function Header({
    inputRef,
    currentInput,
    isLoading,
    isActive,
    currentBot,
    onInputChange,
    onKeyDown,
    onEndChat
}: HeaderProps) {
    return (
        <div className="px-4 draggable">
            <div className="mx-auto flex items-center h-14">
                <img
                    src="/icon.gif"
                    onClick={() => isActive ? onEndChat() : cmd.open("settings", {}, { width: 800, height: 600 })}
                    className="w-[36px] hover:scale-110 transition-all rounded-md"
                />
                <div className="flex-1 pl-2">
                    <Input
                        ref={inputRef}
                        value={currentInput}
                        variant="ghost"
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="text-sm"
                        placeholder={isActive ? `与 ${currentBot?.name} 对话...` : "选择一个助手开始对话..."}
                    />
                </div>
                <Button onClick={HistoryPage.open} size="icon">
                    <TbHistory className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => cmd.open("settings", {}, { width: 800, height: 600 })}
                >
                    {isLoading ? (
                        <TbLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <TbSettings className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}

interface BotListProps {
    botList: BotProps[];
    selectedIndex: number;
    currentInput: string;
    onSelectBot: (index: number) => void;
    onStartChat: (bot: BotProps) => void;
}

function BotList({ botList, selectedIndex, currentInput, onSelectBot, onStartChat }: BotListProps) {
    return (
        <div className="container mx-auto px-4 max-w-2xl space-y-1">
            {botList.map((bot, index) => (
                <BotItem
                    key={bot.name}
                    bot={bot}
                    isSelected={index === selectedIndex}
                    onClick={() => {
                        const trimmedInput = currentInput.trim();
                        if (trimmedInput) {
                            onStartChat(bot);
                        } else {
                            onSelectBot(index);
                        }
                    }}
                />
            ))}
        </div>
    );
}

interface ChatBoxProps {
    currentBot: Bot;
    onEndChat: () => void;
}

function ChatBox({ currentBot, onEndChat }: ChatBoxProps) {
    const list = ChatHistory.use();
    const message = list[currentBot.model.historyMessage.id];
    const messagesEndRef = useRef<HTMLDivElement>(null);

    if (!message) {
        onEndChat();
        return null;
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [list]);

    return (
        <div className="px-2 space-y-2 my-2">
            {message.list.map((message, index) => (
                <MessageItem key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}

