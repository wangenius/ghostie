import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { PiCaretLeft } from 'react-icons/pi';

// 添加宽度配置接口
interface SidebarWidth {
  expanded: string;
  collapsed: string;
}

// 修改 createSidebarVariants，添加 overflow 控制
const createSidebarVariants = (width: SidebarWidth) => ({
  expanded: {
    width: width.expanded,
    overflow: 'visible',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  collapsed: {
    width: width.collapsed,
    overflow: width.collapsed === '0px' ? 'visible' : 'hidden',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
});

interface SidebarProps {
  children: React.ReactNode;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  className?: string;
  showCollapseButton?: boolean;
  width?: SidebarWidth; // 新增宽度配置
}

interface SidebarHeaderProps {
  collapsed?: boolean;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const SidebarHeader = ({
  collapsed = false,
  left,
  center,
  right,
  className,
}: SidebarHeaderProps) => {
  return (
    <div
      className={cn(
        'flex h-16 items-center flex-none w-full justify-between',
        collapsed ? 'justify-center' : 'px-3',
        className
      )}
    >
      <SidebarHeaderLeft collapsed={collapsed}>{left}</SidebarHeaderLeft>

      {!collapsed && center && (
        <div className="flex-1 flex justify-center">
          <SidebarHeaderCenter>{center}</SidebarHeaderCenter>
        </div>
      )}

      {!collapsed && right && <SidebarHeaderRight>{right}</SidebarHeaderRight>}
    </div>
  );
};

export const SidebarHeaderLeft = ({
  children,
  collapsed,
}: {
  children?: React.ReactNode;
  collapsed?: boolean;
}) => {
  return (
    <div
      className={cn('flex items-center gap-3', collapsed && 'justify-center')}
    >
      {children}
    </div>
  );
};

export const SidebarHeaderRight = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div className="flex items-center">{children}</div>;
};

export const SidebarHeaderCenter = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div className="flex items-center font-medium">{children}</div>;
};

export const SidebarContainer = ({
  children,
  collapsed = false,
  setCollapsed,
  className,
  showCollapseButton = true,
  width = { expanded: '360px', collapsed: '64px' },
}: SidebarProps) => {
  const isFullyCollapsed = width.collapsed === '0px';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && e.ctrlKey) {
        setCollapsed?.(!collapsed);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [collapsed]);

  return (
    <div className="relative flex flex-1 h-screen bg-muted/20">
      <motion.div
        initial={false}
        className={cn(
          'relative flex flex-col h-full',
          isFullyCollapsed && collapsed
            ? 'pointer-events-none invisible'
            : 'visible',
          className
        )}
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={createSidebarVariants(width)}
      >
        {children}
      </motion.div>

      {/* 折叠按钮位置调整 */}
      {showCollapseButton && setCollapsed && (
        <div
          className={cn(
            'absolute z-50',
            isFullyCollapsed ? 'left-0' : '-right-4',
            'bottom-[56px]'
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center justify-center',
              'w-4 h-14',
              isFullyCollapsed ? 'rounded-l-lg' : 'rounded-r-lg',
              'bg-zinc-400 hover:bg-zinc-300',
              'transition-colors'
            )}
          >
            <PiCaretLeft
              className={cn(
                'w-3 h-3 text-zinc-100',
                'transition-transform duration-200',
                collapsed && 'rotate-180'
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
};

// 侧边栏分组组件
export const SidebarSection = ({
  children,
  title,
  collapsed,
}: {
  children: React.ReactNode;
  title?: string;
  collapsed?: boolean;
}) => {
  return (
    <div className="py-2 w-full">
      {/* 标题区域使用统一的内边距 */}

      <div className={cn('h-6 mb-2 px-3', !title && 'h-0')}>
        {!collapsed && title && (
          <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        )}
      </div>

      {/* 内容区域使用统一的内边距 */}
      <div className="min-w-[64px]">
        <div className="grid gap-1 px-3">{children}</div>
      </div>
    </div>
  );
};

// 侧边栏项目组件
export const SidebarItem = ({
  icon,
  children,
  collapsed,
  active,
  className,
  ...props
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  collapsed?: boolean;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={cn(
        'relative h-10',
        'transition-colors duration-200',
        'focus:outline-none rounded-lg',
        collapsed ? 'w-[42px]' : 'w-full',
        active
          ? 'bg-primary/5 text-primary'
          : 'text-muted-foreground hover:bg-muted',
        className
      )}
      {...props}
    >
      {/* 固定宽度的图标容器 */}
      <div
        className={cn(
          'absolute top-0 left-0 w-[42px] h-10',
          'flex items-center justify-center'
        )}
      >
        <div className="w-6 h-6 flex items-center justify-center text-xl">
          {icon && React.createElement(icon)}
        </div>
      </div>

      {/* 修改文字容器，添加动画效果 */}
      <div
        className={cn(
          'h-10 w-full pl-[42px] pr-3 flex items-center',
          'transition-[opacity,transform] duration-200',
          collapsed ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
        )}
      >
        <span className="text-sm truncate">{children}</span>
      </div>

      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
      )}
    </button>
  );
};
