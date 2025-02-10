import { BotManager } from "@/services/bot/BotManger";
import { Bot } from "@/services/bot/bot";
import { cmd } from "@utils/shell";
import { useEffect, useRef, useState } from "react";
import { BsStars } from "react-icons/bs";
import { TbInfoSquare, TbLoader2, TbX } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { BotEdit } from "../edit/BotEdit";

export function MainView() {
    const [inputValue, setInputValue] = useState("");
    const [isChat, setIsChat] = useState(false);
    const [selectedBotIndex, setSelectedBotIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const bots = BotManager.use();
    const { list } = BotManager.current.model.useHistory();



    const botList = Object.values(bots);


    const startChat = (bot: typeof botList[0]) => {
        setIsChat(true);
        console.log(bot);
        BotManager.setCurrent(bot);
    };



    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isChat && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const newIndex = e.key === "ArrowUp"
                ? (selectedBotIndex - 1 + botList.length) % botList.length
                : (selectedBotIndex + 1) % botList.length;
            setSelectedBotIndex(newIndex);
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!inputValue.trim()) return;

            if (!isChat) {
                startChat(botList[selectedBotIndex]);
                return;
            }

            if (!BotManager.current) return;

            try {
                setLoading(true);
                const userInput = inputValue;
                setInputValue("");
                BotManager.current.chat(userInput);

            } catch (error) {
                console.error("发送消息失败:", error);
            } finally {
                setLoading(false);
            }
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
        <div data-tauri-drag-region className="flex  flex-col h-screen bg-background">
            <div data-tauri-drag-region className="pt-2 px-4 ">
                <div data-tauri-drag-region className="flex items-center gap-2 h-10">
                    <Button

                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                            await cmd.open("settings", {});
                        }}
                        className="z-10 btn cursor-pointer"
                    >
                        <BsStars className="w-[18px] h-[18px]" />
                    </Button>

                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}

                            onKeyDown={handleKeyDown}
                            className="w-full text-sm h-10 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                            placeholder={isChat ? `与 ${BotManager.current.name} 对话...` : "选择一个助手开始对话..."}
                        />
                    </div>


                    <div className="flex items-center gap-2">
                        {loading ? (
                            <button
                                onClick={() => {
                                    BotManager.current.loading.set({ status: false });
                                    setLoading(false);
                                }}
                                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"

                            >
                                <TbLoader2 className="w-[18px] h-[18px] animate-spin" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (isChat) {
                                        setIsChat(false);
                                        BotManager.setCurrent({
                                            name: "",
                                            system: "",
                                            model: "",
                                            tools: []
                                        });
                                    } else {
                                        cmd.close();
                                    }
                                }}
                                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
                            >



                                <TbX className="w-[18px] h-[18px]" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 mt-2 overflow-y-auto">
                {!isChat ? (
                    <div className="p-4">
                        {botList.map((bot, index) => (
                            <div
                                key={bot.name}
                                className={`p-4 cursor-pointer rounded-lg mb-2 ${index === selectedBotIndex ? 'bg-secondary' : 'hover:bg-secondary/50'
                                    }`}
                                onClick={() => startChat(bot)}
                            >
                                <div className="font-bold">{bot.name}</div>
                                <div className="text-sm text-muted-foreground">{bot.system}</div>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    BotEdit.open(bot.name)
                                }} className="w-4 h-4">
                                    <TbInfoSquare className="w-[18px] h-[18px]" />
                                </Button>


                            </div>
                        ))}
                    </div>
                ) : (
                    list.map((message, index) => (
                        <div key={index} className={`p-4 ${message.role === 'user' ? 'bg-gray-100' : 'bg-white'}`}>
                            <div className="font-bold">{message.role === 'user' ? '用户' : '助手'}</div>
                            <div className="mt-2 whitespace-pre-wrap">{message.content}</div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
