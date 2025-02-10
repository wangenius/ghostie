import { cn } from '@/utils/utils';
import { useState } from 'react';

interface SectionPanelProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  icon?: React.ElementType;
  actions?: React.ReactNode | ((isExpanded: boolean) => React.ReactNode);
  closed?: boolean;
}

export const SectionPanel = (props: SectionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <section className="space-y-1 bg-muted p-2 rounded-lg">
      <div
        className="flex items-center justify-between gap-2 h-7 pl-1 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (props.collapsible) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {props.icon && (
          <props.icon className={cn('h-5 w-5 transition-transform shrink-0')} />
        )}
        <span
          className={cn('font-medium text-sm flex-1', !props.icon && 'pl-2')}
        >
          {props.title}
        </span>
        <div onClick={e => e.stopPropagation()}>
          {typeof props.actions === 'function'
            ? props.actions(isExpanded)
            : props.actions}
        </div>
      </div>
      {!props.closed && isExpanded && (
        <div className="relative">{props.children}</div>
      )}
    </section>
  );
};
