import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea, CustomTextAreaRef } from '@/components/ui/textarea';
import { TbSend, TbPaperclip } from 'react-icons/tb';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "输入消息...",
}) => {
  const textareaRef = useRef<CustomTextAreaRef>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current?.dom;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 发送消息
  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        {/* 附件按钮 */}
        <Button
          size="icon"
          variant="ghost"
          className="mb-2 flex-shrink-0"
          disabled={disabled}
        >
          <TbPaperclip className="w-4 h-4" />
        </Button>

        {/* 输入框 */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none",
              "pr-12 py-3",
              "border-input bg-background"
            )}
            rows={1}
          />
          
          {/* 发送按钮 */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className={cn(
              "absolute right-2 bottom-2 h-8 w-8",
              "transition-all duration-200",
              value.trim() && !disabled
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <TbSend className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 提示文本 */}
      <div className="text-xs text-muted-foreground mt-2 px-1">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}; 