import { iconVariants } from "@/components/custom/CodeBlock";
import { MarkdownRender } from "@/components/Markdown/MarkdownRender";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { MessageItem } from "@/model/types/chatModel";
import { ImagesStore } from "@/resources/Image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  TbBrain,
  TbCopy,
  TbMathFunction,
  TbLoader2,
  TbMaximize,
} from "react-icons/tb";

interface MessageItemProps {
  message: MessageItem;
}

export function ChatMessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<{ type: string; name: string }>({
    type: "",
    name: "",
  });
  const images = ImagesStore.use();

  useEffect(() => {
    if (message.tool_calls) {
      ToolsHandler.ToolNameParser(message.tool_calls[0].function.name).then(
        (res) => setToolCalls(res),
      );
    }
  }, [message.tool_calls]);
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  // 如果是隐藏的用户消息或tool:result消息,则不渲染
  if (message.hidden) {
    return null;
  }
  if (message.tool_call_id && !message.images?.length) {
    return null;
  }
  if (message.tool_call_id && message.images?.length) {
    if (message.tool_loading) {
      return (
        <div className="flex items-center gap-2 px-3 rounded-md text-primary text-sm py-2">
          <TbLoader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-muted-foreground">loading...</span>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {message.images.map((image) => (
          <div
            key={image}
            className="relative group/image w-[300px] aspect-square rounded-lg overflow-hidden bg-muted"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={`${images[image].base64Image}`}
              alt="生成的图片"
              className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
              <TbMaximize className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent className="max-w-[80vw] max-h-[80vh] p-0 bg-black/90 border-none">
            {selectedImage && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={`${images[selectedImage].base64Image}`}
                  alt="用户上传的图片"
                  className="max-w-full max-h-[98vh] object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedImage(null)}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (message.role === "user")
    return (
      <>
        <div
          className={cn(
            "border-0 px-3 py-1 rounded-3xl transition-colors group overflow-hidden text-muted-foreground text-sm",
          )}
        >
          {message.content && (
            <span className="block mb-2">{message.content}</span>
          )}
          {message.images && message.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {message.images.map((image) => (
                <div
                  key={image}
                  className="relative group/image aspect-square rounded-lg overflow-hidden bg-muted"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={`data:${images[image].contentType};base64,${images[image].base64Image}`}
                    alt="用户上传的图片"
                    className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                    <TbMaximize className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-black/90 border-none">
            {selectedImage && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={`data:${images[selectedImage].contentType};base64,${images[selectedImage].base64Image}`}
                  alt="用户上传的图片"
                  className="max-w-full max-h-[98vh] object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedImage(null)}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
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
          {toolCalls.name}
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
