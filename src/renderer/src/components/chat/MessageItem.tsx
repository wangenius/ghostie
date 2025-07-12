import React from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@common/types/agent';
import { MarkdownRender } from '@/components/Markdown/MarkdownRender';
import { Tools } from '@/utils/tools';
import { Avatar } from '@/components/ui/Avatar';
import { TbUser, TbRobot } from 'react-icons/tb';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // 用户消息
  if (isUser) {
    return (
      <div className={cn(
        "w-fit border-0 px-4 py-1.5 mt-2 rounded-3xl rounded-tr-none transition-colors group overflow-hidden text-sm ml-auto max-w-[85%]",
        "text-muted-foreground bg-muted",
      )}>
        {message.content && <span className="block">{message.content}</span>}
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 py-1">
            {message.images.map((image, index) => (
              <div
                key={index}
                className="relative group/image aspect-square rounded-[8px] overflow-hidden bg-muted max-w-[100px]"
              >
                <img
                  src={`data:${image.contentType};base64,${image.base64Image}`}
                  alt="用户上传的图片"
                  className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 助手消息
  if (isAssistant && !message.content) {
    return null;
  }

  return (
    <div className="border-0 transition-colors group overflow-hidden text-primary text-sm space-y-2">
      {isAssistant && message.content && (
        <MarkdownRender>{message.content}</MarkdownRender>
      )}
      
      <div className="text-xs text-muted-foreground items-center flex select-none">
        <span className="flex items-center gap-1 px-2">
          {new Date(message.timestamp)
            .toLocaleString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(/\//g, ".")}
        </span>
      </div>
    </div>
  );
}; 