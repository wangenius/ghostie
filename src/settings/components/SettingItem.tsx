import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SettingItemProps {
  icon: ReactNode;
  title: string;
  description?: string | ReactNode;
  action: ReactNode;
  titleClassName?: string;
}

export function SettingItem({
  icon,
  title,
  description,
  action,
  titleClassName,
}: SettingItemProps) {
  return (
    <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className={cn("text-sm text-foreground", titleClassName)}>
            {title}
          </div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
