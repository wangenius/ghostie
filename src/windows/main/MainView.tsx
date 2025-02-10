import { ChatManager } from "@services/manager/ChatManager";
import { cmd } from "@utils/shell";
import { useEffect, useRef, useState } from "react";
import { BsStars } from "react-icons/bs";
import { TbLoader2, TbX } from "react-icons/tb";

export function MainView() {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { list } = ChatManager.current.useHistory();
    const { loading } = ChatManager.current.loading.use();

    useEffect(() => {
        ChatManager.create("deepseek");
    }, []);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!inputValue.trim()) return;
            try {
                if (!inputValue.trim()) return;
                await ChatManager.current.stream(inputValue);
                setInputValue("");
            } catch (error) {
                console.error("发送消息失败:", error);
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

        // 添加全局快捷键监听
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "i") {
                e.preventDefault();
                inputRef.current?.focus();
            } else if (e.ctrlKey && e.key.toLowerCase() === "h") {
                e.preventDefault();
            } else if (e.ctrlKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "r")) {
                e.preventDefault();
                inputRef.current?.focus();
            } else if ((e.ctrlKey && e.key.toLowerCase() === ",") || e.key.toLowerCase() === "，") {
                e.preventDefault();
                cmd.open("settings", {}, { width: 800, height: 600 });
            } else if (
                e.ctrlKey &&
                (e.key.toLowerCase() === "j" ||
                    e.key.toLowerCase() === "u" ||
                    e.key.toLowerCase() === "p" ||
                    e.key.toLowerCase() === "f" ||
                    e.key.toLowerCase() === "g")
            ) {
                e.preventDefault();
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
            <div className="pt-2 px-4 draggable">
                <div className="flex items-center gap-2 h-10">
                    <span
                        onClick={async () => {
                            await cmd.open("settings", {});
                        }}
                        className="z-10 btn cursor-pointer"
                    >
                        <BsStars className="w-[18px] h-[18px]" />
                    </span>

                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full text-sm h-10 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                            placeholder={`对话...`}

                        />
                    </div>


                    <div className="flex items-center gap-2">
                        {loading ? (
                            <button
                                onClick={() => {
                                    ChatManager.current.stop()

                                }}
                                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
                            >

                                <TbLoader2 className="w-[18px] h-[18px] animate-spin" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (list.length === 0) {
                                        cmd.close();
                                    }
                                    ChatManager.current.new();

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
                {list.map((message, index) => (
                    <div key={index} className={`p-4 ${message.role === 'user' ? 'bg-gray-100' : 'bg-white'}`}>
                        <div className="font-bold">{message.role === 'user' ? '用户' : '助手'}</div>
                        <div className="mt-2">{message.content}</div>

                    </div>
                ))}
            </div>
        </div>
    );
}
