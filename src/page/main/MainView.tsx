import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotManager } from "@/services/bot/BotManger";
import { cmd } from "@utils/shell";
import { useEffect, useRef, useState } from "react";
import { TbLoader2, TbSettings } from "react-icons/tb";
import { BotItem } from "./components/BotItem";
import { MessageItem } from "./components/MessageItem";

export function MainView() {
    const [inputValue, setInputValue] = useState("");
    const [isChat, setIsChat] = useState(false);
    const [selectedBotIndex, setSelectedBotIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const bots = BotManager.use();
    const { list } = BotManager.current.model.useHistory();
    const botList = Object.values(bots);

    const startChat = (bot: typeof botList[0], initialMessage?: string) => {
        setIsChat(true);
        BotManager.setCurrent(bot.id);
        if (initialMessage) {
            setLoading(true);
            BotManager.current.chat(initialMessage).finally(() => {
                setLoading(false);
            });
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isChat && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const newIndex = e.key === "ArrowUp"
                ? (selectedBotIndex - 1 + botList.length) % botList.length
                : (selectedBotIndex + 1) % botList.length;
            setSelectedBotIndex(newIndex);
        }

        if (e.key === "," && e.ctrlKey) {
            e.preventDefault();
            cmd.open("settings", {}, { width: 800, height: 600 });
        }

        if (e.key === "Backspace" && inputValue.length === 0 && isChat) {
            setIsChat(false);
            BotManager.setCurrent();
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const trimmedInput = inputValue.trim();
            if (!trimmedInput) return;

            if (!isChat) {
                startChat(botList[selectedBotIndex], trimmedInput);
            } else if (BotManager.current) {
                setLoading(true);
                setInputValue("");
                try {
                    await BotManager.current.chat(trimmedInput);
                } catch (error) {
                    console.error("发送消息失败:", error);
                } finally {
                    setLoading(false);
                }
            }
            setInputValue("");
        }
    };

    useEffect(() => {
        const handleFocus = () => inputRef.current?.focus();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                inputRef.current?.focus();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "i") {
                e.preventDefault();
                inputRef.current?.focus();
            } else if (e.ctrlKey && e.key.toLowerCase() === ",") {
                e.preventDefault();
                cmd.open("settings", {}, { width: 800, height: 600 });
            }
        };

        inputRef.current?.focus();
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* 顶部工具栏 */}
            <div className="px-4 draggable">
                <div className="mx-auto flex items-center h-14">
                    <img src="/icon.gif" onClick={() => {
                        if (isChat) {
                            setIsChat(false);
                            BotManager.setCurrent();
                        } else {
                            cmd.open("settings", {}, { width: 800, height: 600 });
                        }
                    }} className="w-[36px] hover:scale-110 transition-all rounded-md" />


                    <div className="flex-1 pl-2 relative">
                        <Input
                            ref={inputRef}
                            value={inputValue}
                            variant="ghost"
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-sm"
                            placeholder={isChat ? `与 ${BotManager.current.name} 对话...` : "选择一个助手开始对话..."}
                        />
                    </div>


                    {loading ? (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                BotManager.current.loading.set({ status: false });
                                setLoading(false);
                            }}
                        >
                            <TbLoader2 className="h-4 w-4 animate-spin" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => cmd.open("settings", {}, { width: 800, height: 600 })}
                        >
                            <TbSettings className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {!isChat ? (
                        <div className="container mx-auto px-4 max-w-2xl">
                            <div className="space-y-2">
                                {botList.map((bot, index) => (
                                    <BotItem
                                        key={bot.name}
                                        bot={bot}
                                        isSelected={index === selectedBotIndex}
                                        onClick={() => {
                                            const trimmedInput = inputValue.trim();
                                            if (trimmedInput) {
                                                startChat(bot, trimmedInput);
                                                setInputValue("");
                                            } else {
                                                setSelectedBotIndex(index);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="px-2 space-y-2 my-2">
                            {list.map((message, index) => (
                                <MessageItem key={index} message={message} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
