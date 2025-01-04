import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Message } from "../types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unlistenResponse = listen("chat-response", (event) => {
      const chunk = event.payload as string;
      setMessages((messages) => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "assistant") {
          return [
            ...messages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + chunk },
          ];
        }
        return [...messages, { role: "assistant", content: chunk }];
      });
    });

    const unlistenComplete = listen("chat-complete", () => {
      setIsLoading(false);
    });

    return () => {
      unlistenResponse.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const sendMessage = async (message: string) => {
    setIsLoading(true);
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await invoke("chat", {
        messages: [...messages, userMessage],
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      setIsLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
} 