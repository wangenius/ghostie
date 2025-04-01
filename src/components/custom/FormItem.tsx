import { cn } from "@/lib/utils";
import { memo } from "react";

export const PairItem = memo(
  ({
    icon,
    label,
    children,
    className,
  }: {
    icon?: React.ElementType;
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const Icon = icon;
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-foreground" />}
          {label}
        </label>
        <div className="flex items-center gap-2 w-full">{children}</div>
      </div>
    );
  },
);
