import { cn } from "@/lib/utils";
import { PiEmpty } from "react-icons/pi";

export function PreferenceBody({
  children,
  header,
  emptyText,
  EmptyIcon,
  isEmpty,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  emptyText?: string;
  EmptyIcon?: React.ElementType;
  isEmpty?: boolean;
  className?: string;
}) {
  if (isEmpty) {
    return (
      <div className="h-full flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
        {EmptyIcon ? (
          <EmptyIcon className="w-12 h-12 text-muted-foreground/50" />
        ) : (
          <PiEmpty className="w-12 h-12 text-muted-foreground/50" />
        )}
        <p className="text-center">{emptyText || "No data"}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col px-4 overflow-hidden h-full gap-3">
      <div className="flex items-center justify-between">{header}</div>
      <div
        className={cn(
          "flex-1 min-w-0 h-full overflow-hidden flex flex-col !mt-0 gap-3",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
