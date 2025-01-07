import { AnimatePresence, motion } from "framer-motion";
import { CopyIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatManager } from "../services/ChatManager";

export function ChatView() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessage = useRef<string>("");
  const { messages, loading } = ChatManager.use();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    const assistantMessages = messages.filter(m => m.role === "assistant");
    if (assistantMessages.length > 0) {
      lastAssistantMessage.current = assistantMessages[assistantMessages.length - 1].content;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
          e.preventDefault();
          navigator.clipboard.writeText(lastAssistantMessage.current);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加一个临时的提示效果
      const target = document.activeElement as HTMLElement;
      if (target) {
        const originalTitle = target.getAttribute('title');
        target.setAttribute('title', '已复制!');
        setTimeout(() => {
          target.setAttribute('title', originalTitle || '');
        }, 1000);
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2">
      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="group"
          >
            <div className={`
              py-2 px-4 mt-2 rounded-xl
              ${message.role === "assistant" ? "bg-secondary" : "bg-background"}
            `}>
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-sm !select-text leading-relaxed whitespace-pre-wrap text-foreground"
                >
                  {message.content}
                  {loading && index === messages.length - 1 && message.role === "assistant" && (
                    <motion.div
                      className="inline-flex ml-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{
                          scale: [0.5, 1.2, 0.5],
                          opacity: [0.2, 1, 0.2],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
                {message.role === "assistant" && (
                  <motion.button
                    onClick={() => copyMessage(message.content)}
                    className="absolute -right-4 -bottom-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="复制消息 (Ctrl+C)"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}