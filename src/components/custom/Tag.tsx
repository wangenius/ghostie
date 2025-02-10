import { cn } from '@/utils/utils';
import { forwardRef } from 'react';
import { TbBookmark } from 'react-icons/tb';
import { Button, ButtonProps } from '../ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface TagProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  activeClassName?: string;
}

export const Tag = forwardRef<HTMLDivElement, TagProps>(
  ({ children, onClick, active, activeClassName, className }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs transition-colors cursor-pointer bg-muted/50 text-muted-foreground hover:bg-muted',
          className,
          active && activeClassName
        )}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {children}
      </div>
    );
  }
);

interface DynamicTagProps {
  label: string;
  id: string;
  onClick?: (id: string) => void;
  onClickIcon?: (id: string) => void;
  className?: string;
  icon?: React.ElementType;
  iconVariant?: ButtonProps['variant'];
  items?: {
    label: string;
    icon?: React.ElementType;
    variant?: 'default' | 'destructive';
    onClick: () => void;
  }[];
}

export const DynamicTag = forwardRef<HTMLDivElement, DynamicTagProps>(
  (props, ref) => {
    return (
      <span
        ref={ref}
        onClick={e => {
          e.stopPropagation();
          props.onClick?.(props.id);
        }}
        className={cn(
          ' w-fit inline-flex items-center gap-1 pr-2 pl-0.5 group py-0.5 rounded-lg text-xs cursor-pointer',
          'bg-card border border-border/60',
          'transition-colors duration-100'
        )}
      >
        {props.items ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant={'ghost'}
                className="h-6 w-6 p-1 data-[state=open]:bg-muted-foreground/10 group-hover:bg-muted-foreground/10 shrink-0"
              >
                {props.icon ? (
                  <props.icon className="h-5 w-5" />
                ) : (
                  <TbBookmark className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {props.items.map(item => (
                <DropdownMenuItem
                  key={item.label}
                  variant={item.variant}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    item.onClick();
                  }}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant={props.iconVariant || 'ghost'}
            size="sm"
            onClick={e => {
              e.stopPropagation();
              props.onClickIcon?.(props.id);
            }}
            className="h-6 w-6 p-1 shrink-0"
          >
            {props.icon ? (
              <props.icon className="h-5 w-5" />
            ) : (
              <TbBookmark className="h-5 w-5" />
            )}
          </Button>
        )}
        <span className="font-medium line-clamp-1 max-w-[180px]">
          {props.label}
        </span>
      </span>
    );
  }
);
