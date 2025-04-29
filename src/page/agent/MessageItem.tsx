import { iconVariants } from "@/components/custom/CodeBlock";
import { MarkdownRender } from "@/components/Markdown/MarkdownRender";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolsHandler } from "@/model/chat/ToolsHandler";
import { MessageItem } from "@/model/types/chatModel";
import { ImagesStore } from "@/resources/Image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  TbBrain,
  TbCheck,
  TbCopy,
  TbLoader2,
  TbMathFunction,
  TbMaximize,
} from "react-icons/tb";
import { ImageView } from "../main/ImageView";

interface MessageItemProps {
  message: MessageItem;
  lastMessage?: MessageItem;
  nextMessage?: MessageItem;
}

const MessageItemState = ({
  isLoading,
  name,
  placeholder,
  icon: Icon,
  onClick,
}: {
  isLoading: boolean;
  name: string;
  placeholder?: string;
  icon: React.ElementType;
  onClick?: () => void;
}) => {
  return (
    <div
      className={cn(
        "select-none border-0 rounded-[18px] flex overflow-hidden group text-primary transition-colors items-center justify-between p-1",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center p-1 bg-muted rounded-md text-primary">
          {isLoading ? (
            <TbLoader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>
        <span className="text-xs text-muted-foreground/90 group-hover:text-primary">
          {name || placeholder}
        </span>
      </div>
    </div>
  );
};

export function ChatMessageItem({ message, lastMessage }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<{ type: string; name: string }>({
    type: "",
    name: "",
  });
  const images = ImagesStore.use();

  useEffect(() => {
    if (lastMessage?.tool_calls) {
      ToolsHandler.ToolNameParser(
        lastMessage?.tool_calls[0].function.name,
      ).then((res) => setToolCalls(res));
    }
  }, [lastMessage?.tool_calls]);
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  if (message.hidden) return null;

  // 工具调用消息
  if (message.tool_call_id && !message.images?.length) {
    return (
      <MessageItemState
        isLoading={message.tool_loading || false}
        name={toolCalls.name || "工具调用"}
        icon={TbMathFunction}
      />
    );
  }
  if (message.tool_call_id && message.images?.length) {
    if (message.tool_loading) {
      return (
        <div className="border-0 p-1 rounded-b-3xl px-4 flex gap-2 transition-colors group overflow-hidden text-primary bg-muted text-sm space-y-2">
          <div className="relative group/image w-[160px] aspect-square rounded-lg overflow-hidden bg-muted-foreground/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <TbLoader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">
                generating image...
              </span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="border-0 p-1 flex px-4 gap-2 transition-colors group overflow-hidden text-primary text-sm space-y-2">
        {message.images.map((image) => (
          <div
            key={image}
            className="relative group/image w-[160px] mb-1 aspect-square rounded-lg overflow-hidden"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={images[image]?.base64Image}
              alt="生成的图片"
              className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
              <TbMaximize className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
        <ImageView
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
        />
      </div>
    );
  }

  if (message.role === "user")
    return (
      <>
        <div
          className={cn(
            "w-fit border-0 px-4 py-1.5 mt-2 rounded-3xl rounded-tr-none transition-colors group overflow-hidden text-sm ml-auto max-w-[85%]",
            "text-muted-foreground bg-muted",
          )}
        >
          {message.content && <span className="block">{message.content}</span>}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 py-1">
              {message.images.map((image) => (
                <div
                  key={image}
                  className="relative group/image aspect-square rounded-[8px] overflow-hidden bg-muted max-w-[100px]"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={images[image]?.base64Image}
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
        <ImageView
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
        />
      </>
    );

  if (
    message.role === "assistant" &&
    !message.content &&
    !message.loading &&
    !message.reasoner
  )
    return null;

  return (
    <div
      data-id={message.role}
      className={cn(
        "border-0 transition-colors group overflow-hidden text-primary text-sm space-y-2",
      )}
    >
      {message.loading && !message.content && !message.reasoner && (
        <MessageItemState
          isLoading={message.loading || false}
          name="loading..."
          icon={TbLoader2}
        />
      )}
      {message.reasoner && (
        <div className={cn("gap-2 rounded-[18px] transition-colors")}>
          <MessageItemState
            name="reasoning"
            icon={TbBrain}
            onClick={() => setShowReasoning((prev) => !prev)}
            isLoading={!(message.content || message.tool_calls)}
          />
          {showReasoning && (
            <div className="text-[12px] text-muted-foreground/70 pl-3 pt-1 pb-3 ml-3 border-l-2 border-muted">
              {message.reasoner.split("\n").map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          )}
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
      {!message.tool_calls && !message.loading && (
        <div className="text-xs text-muted-foreground items-center flex select-none">
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
                  <TbCheck className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <TbCopy className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
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
        </div>
      )}
    </div>
  );
}
