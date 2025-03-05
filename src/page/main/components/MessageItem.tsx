import { Message } from "@/common/types/model";
import { CodeBlock, iconVariants } from "@/components/custom/CodeBlock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  TbCopy,
  TbExclamationCircle,
  TbLoader,
  TbMathFunction,
} from "react-icons/tb";
import ReactMarkdown, { Components } from "react-markdown";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // 如果是隐藏的用户消息或function:result消息,则不渲染
  if (message.type === "user:hidden" || message.type === "function:result") {
    return null;
  }

  // 根据消息类型获取样式
  const getMessageStyle = () => {
    switch (message.type) {
      case "system":
        return "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200";
      case "assistant:pending":
        return "bg-muted/50 opacity-60";
      case "assistant:tool":
        return "bg-purple-50 dark:bg-purple-950/30 text-sm";
      case "function:result":
        return "bg-gray-50 dark:bg-gray-900/50 font-mono text-sm";
      case "assistant:error":
        return "bg-red-50 dark:bg-red-900/50 font-mono text-sm";
      default:
        return isUser ? "bg-background" : "bg-muted";
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 添加自定义链接组件
  const CustomLink: Components["a"] = ({ href, children }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (href) {
        window.open(href, "_blank");
      }
    };

    return (
      <a
        href={href}
        onClick={handleClick}
        className="text-primary hover:underline"
      >
        {children}
      </a>
    );
  };

  return (
    <div
      className={cn(
        "border-0 p-2 rounded-xl transition-colors group overflow-hidden",
        getMessageStyle(),
      )}
    >
      <div className="mx-auto flex gap-5">
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm px-2 select-text max-w-none dark:prose-invert",
              "text-foreground leading-6",
              message.type === "system" && "font-medium",
            )}
          >
            {message.type === "assistant:pending" && (
              <div className="flex items-center gap-2">
                <TbLoader className="h-4 w-4 animate-spin" />
                <span>{message.content}</span>
              </div>
            )}
            {message.type === "user:input" && (
              <div className="flex items-center gap-2">
                <span>{message.content}</span>
              </div>
            )}
            {(message.type === "assistant:reply" ||
              message.type === "assistant:tool") && (
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                  a: CustomLink,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
            {message.tool_calls && (
              <span className="flex items-center gap-1 p-2 rounded-md bg-primary/10 text-primary text-xs my-1">
                <TbMathFunction className="h-3.5 w-3.5" />
                调用工具: {message.tool_calls?.[0]?.function.name}
              </span>
            )}
            {message.type === "assistant:error" && (
              <span className="flex items-center gap-1 p-2 rounded-md bg-red-500/10 text-red-500 text-xs my-1">
                <TbExclamationCircle className="h-3.5 w-3.5" />
                {message.content}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground items-center flex justify-between select-none">
            {message.type === "assistant:reply" && (
              <span className="flex items-center gap-1 px-2">
                {new Date(message.created_at)
                  .toLocaleString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(/\//g, ".")}
              </span>
            )}
            {!isUser && message.type === "assistant:reply" && (
              <Button variant="ghost" size="icon" onClick={handleCopyMessage}>
                {copied ? (
                  <motion.div
                    key="success"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-emerald-400"
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
        </div>
      </div>
    </div>
  );
}
