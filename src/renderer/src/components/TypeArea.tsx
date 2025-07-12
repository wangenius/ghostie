import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea, CustomTextAreaRef } from '@/components/ui/textarea';
import { TbCornerRightUp, TbLoader } from 'react-icons/tb';

interface TypeAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const TypeArea = memo<TypeAreaProps>(({
  value,
  onChange,
  onSend,
  loading = false,
  placeholder = "输入消息...",
  className,
}) => {
  const handleSend = () => {
    if (value.trim() && !loading) {
      onSend(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col relative h-[120px] border rounded-2xl", className)}>
      <div className="flex flex-1 flex-col relative overflow-y-auto px-3 py-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          variant="ghost"
          className="flex-1 min-h-[80px] resize-none border-none outline-none focus:outline-none bg-transparent"
        />
      </div>
      <div className="flex-none flex justify-end px-1 py-1">
        <Button
          onClick={handleSend}
          variant={loading ? "primary" : "ghost"}
          disabled={value.trim() === "" && !loading}
          className={cn(
            "no-drag rounded-full !h-6 pr-1",
            value.trim() === "" &&
              !loading &&
              "opacity-50 hover:bg-transparent cursor-default hover:opacity-50",
          )}
        >
          {loading ? "stop" : "OK"}
          {loading ? (
            <TbLoader className="w-4 h-4 animate-spin" />
          ) : (
            <TbCornerRightUp className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}); 