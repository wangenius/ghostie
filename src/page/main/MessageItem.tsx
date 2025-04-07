import { iconVariants } from "@/components/custom/CodeBlock";
import { MarkdownRender } from "@/components/Markdown/MarkdownRender";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { MessageItem } from "@/model/types/chatModel";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TbBrain, TbCopy, TbMathFunction, TbLoader2 } from "react-icons/tb";

interface MessageItemProps {
  message: MessageItem;
}

export function ChatMessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const [toolCalls, setToolCalls] = useState<{ type: string; name: string }>({
    type: "",
    name: "",
  });

  useEffect(() => {
    if (message.tool_calls) {
      ToolsHandler.ToolNameParser(message.tool_calls[0].function.name).then(
        (res) => setToolCalls(res),
      );
    }
  }, [message.tool_calls]);

  // 如果是隐藏的用户消息或tool:result消息,则不渲染
  if (message.hidden || message.tool_call_id) {
    return null;
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (message.role === "user")
    return (
      <div
        className={cn(
          "border-0 px-3 py-1 rounded-3xl transition-colors group overflow-hidden text-muted-foreground text-sm",
        )}
      >
        <span>{message.content}</span>
      </div>
    );

  return (
    <div
      className={cn(
        "border-0 p-3 rounded-3xl transition-colors group overflow-hidden text-primary bg-muted text-sm space-y-2",
      )}
    >
      {message.reasoner && (
        <div className="gap-2 bg-primary/5 rounded-md p-2">
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReasoning((prev) => !prev);
            }}
            className="flex items-center gap-2 p-1 text-xs"
          >
            <TbBrain className="h-4 w-4" />
            <span>reasoning</span>
          </div>
          {showReasoning && (
            <div className="text-xs text-muted-foreground">
              {message.reasoner.split("\n").map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {message.loading && !message.content && (
        <div className="flex items-center gap-2 px-3 rounded-md text-primary text-sm py-2">
          <TbLoader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-muted-foreground">loading...</span>
        </div>
      )}

      {message.role === "assistant" && message.content && (
        <MarkdownRender>{message.content}</MarkdownRender>
      )}
      {message.error && (
        <div className="flex items-center gap-2 px-3 bg-red-500/10 rounded-md text-red-500 text-sm py-2">
          <span>{message.error}</span>
        </div>
      )}
      {toolCalls.type ? (
        <div className="flex items-center gap-1 p-2 rounded-full bg-primary/10 text-primary text-xs">
          {message.tool_loading ? (
            <TbLoader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <TbMathFunction className="h-3.5 w-3.5" />
          )}
          调用: {toolCalls.type}:{toolCalls.name}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground items-center flex justify-between select-none">
          {message.role === "assistant" && (
            <span className="flex items-center gap-1 px-2">
              {new Date(message.created_at)
                .toLocaleString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(/\//g, ".")}
            </span>
          )}
          {!isUser && message.role === "assistant" && (
            <Button variant="ghost" size="icon" onClick={handleCopyMessage}>
              {copied ? (
                <motion.div
                  key="success"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17L4 12" />
                  </svg>
                </motion.div>
              ) : (
                <TbCopy className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
