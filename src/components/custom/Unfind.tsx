import { cn } from '@/utils/utils';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export const Unfind = ({
  className,
  title = '未找到相关内容',
  description = '尝试使用不同的关键词搜索',
}: {
  className?: string;
  title?: string;
  description?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center h-full text-center px-6 py-8',
        className
      )}
    >
      <Search className="w-10 h-10 text-muted-foreground/20 mb-4" />
      <div className="text-sm font-medium text-muted-foreground/60 mb-1">
        {title}
      </div>
      <div className="text-xs text-muted-foreground/40">{description}</div>
    </motion.div>
  );
};
