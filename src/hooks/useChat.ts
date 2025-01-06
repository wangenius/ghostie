import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { Message } from "../types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const historyIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const unlistenResponse = listen("chat-response", (event) => {
      const chunk = event.payload as string;
      setMessages((messages) => {
        const lastMessage = messages[messages.length - 1];
        return [
          ...messages.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + chunk },
        ];
      });
    });

    const unlistenComplete = listen("chat-complete", () => {
      setIsLoading(false);
      const currentMessages = messagesRef.current;
      if (historyIdRef.current && currentMessages.length >= 2) {
        const userMessages = currentMessages.filter(
          (msg) => msg.role === "user"
        );
        const title = userMessages[0].content.slice(0, 50) + "...";
        const preview =
          currentMessages[currentMessages.length - 1].content.slice(0, 100) +
          "...";
        invoke("update_chat_history", {
          id: historyIdRef.current,
          title,
          preview,
          messages: currentMessages,
        }).catch(console.error);
      }
    });

    return () => {
      unlistenResponse.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const sendMessage = async (message: string, bot?:string) => {
    setIsLoading(true);
    const userMessage: Message = { role: "user", content: message };
    const assistantMessage: Message = { role: "assistant", content: "" };
    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);

    if (messages.length === 0) {
      try {
        const id = await invoke<string>("create_chat_history");
        historyIdRef.current = id;
      } catch (error) {
        console.error("创建历史记录失败:", error);
      }
    }

    try {
      await invoke("chat", {
        messages: newMessages.slice(0, -1),
        bot: bot,
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      setMessages(prevMessages => {
        return [...prevMessages.slice(0, -1), { role: "assistant", content: String(error) }];
      });
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    historyIdRef.current = null;
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
