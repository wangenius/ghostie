import React from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@common/types/agent';
import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage?: string;
  isStreaming?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessage,
  isStreaming,
}) => {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-sm">开始新的对话</p>
          <p className="text-xs mt-1">输入消息开始与 AI 助手交流</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {isStreaming && streamingMessage && (
          <StreamingMessage content={streamingMessage} />
        )}
      </div>
    </ScrollArea>
  );
}; 