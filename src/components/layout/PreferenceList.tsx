import { cn } from "@/lib/utils";
import { PiEmpty } from "react-icons/pi";
import { TbTrash } from "react-icons/tb";
import { Button } from "../ui/button";

interface SettingsListItemProps {
  id: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  onClick: (id: string) => void;
  actived: boolean;
  onRemove?: () => void;
  noRemove?: boolean;
}
interface SettingsListProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  tips?: string;
  items?: SettingsListItemProps[];
  emptyText?: string;
  EmptyIcon?: React.ElementType;
}

export function PreferenceList({
  left,
  right,
  tips,
  items,
  emptyText,
  EmptyIcon,
}: SettingsListProps) {
  return (
    <div className="w-[320px] bg-muted/50 flex flex-col h-full overflow-auto rounded-2xl p-2 gap-2 flex-none">
      <div className="flex-none flex justify-between items-center">
        <div className="flex items-center gap-1">{left}</div>
        <div className="flex items-center gap-1">{right}</div>
      </div>

      {tips && (
        <div className="pr-1">
          <div className="flex-none bg-muted-foreground/10 p-2 px-3 rounded-lg">
            <p className="text-xs text-muted-foreground">{tips}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
        {items?.length ? (
          items.map((item) => <SettingsListItem key={item.id} {...item} />)
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            {EmptyIcon ? (
              <EmptyIcon className="w-12 h-12 text-muted-foreground/50" />
            ) : (
              <PiEmpty className="w-12 h-12 text-muted-foreground/50" />
            )}
            <p className="text-center">{emptyText || "暂无数据"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsListItem({
  id,
  title,
  description,
  onClick,
  actived,
  onRemove,
  noRemove,
}: SettingsListItemProps) {
  return (
    <div
      className={cn(
        "group relative px-3 py-2 rounded-sm transition-all hover:bg-muted-foreground/10 select-none cursor-pointer",
        actived ? "bg-muted-foreground/10" : "bg-transparent",
      )}
      onClick={() => onClick(id)}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm truncate">{title}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {description}
          </div>
        </div>

        {!noRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove?.();
            }}
          >
            <TbTrash className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
