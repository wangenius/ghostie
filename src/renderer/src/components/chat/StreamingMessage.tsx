import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRender } from '@/components/Markdown/MarkdownRender';
import { Avatar } from '@/components/ui/Avatar';
import { TbRobot } from 'react-icons/tb';
import { LoadingSpin } from '@/components/custom/LoadingSpin';

interface StreamingMessageProps {
  content: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content }) => {
  return (
    <div className="flex gap-3 group">
      {/* 头像 */}
      <div className="flex-shrink-0">
        <Avatar className="w-8 h-8">
          <TbRobot className="w-4 h-4" />
        </Avatar>
      </div>

      {/* 消息内容 */}
      <div className="flex-1 max-w-[80%]">
        <div className="rounded-lg px-4 py-2 text-sm bg-muted">
          {/* 消息文本 */}
          <div className="prose prose-sm max-w-none">
            <MarkdownRender>{content}</MarkdownRender>
          </div>

          {/* 正在输入指示器 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <LoadingSpin className="w-3 h-3" />
            <span>正在生成...</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 