import { ActiveTab, SETTINGS_NAV_ITEMS } from "@/App";
import { cn } from "@/lib/utils";
import { PiEmpty } from "react-icons/pi";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface SettingsListItemProps {
  id: string;
  content: string | React.ReactNode;
  onClick: (id: string) => void;
  actived: boolean;
}
interface SettingsListProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  tips?: string;
  items?: SettingsListItemProps[];
  emptyText?: string;
  EmptyIcon?: React.ElementType;
}

export function PreferenceSidebar({
  left,
  right,
  tips,
  items,
  emptyText,
  EmptyIcon,
}: SettingsListProps) {
  const activeTab = ActiveTab.use();
  return (
    <div className="w-[320px] bg-muted flex flex-col h-full">
      <div className="h-9 draggable w-full flex items-center justify-end p-1 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 p-1.5 rounded-md text-xs text-muted-foreground cursor-pointer hover:bg-transparent hover:text-foreground active:bg-transparent active:text-foreground focus:bg-transparent focus:text-foreground"
            >
              {activeTab.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {SETTINGS_NAV_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => ActiveTab.set(item.id as any)}
              >
                <item.icon className="w-8 h-8" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-auto px-2 gap-2 flex-none">
        {tips && (
          <div className="">
            <div className="flex-none bg-muted-foreground/10 p-2 px-3 rounded-lg">
              <p className="text-xs text-muted-foreground">{tips}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1">
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
        <div className="flex-none flex justify-between items-center">
          <div className="flex items-center gap-1">{left}</div>
          <div className="flex items-center gap-1">{right}</div>
        </div>
      </div>
    </div>
  );
}

export function SettingsListItem({
  id,
  content,
  onClick,
  actived,
}: SettingsListItemProps) {
  return (
    <div
      className={cn(
        "group relative px-2 py-2 rounded-md transition-all hover:bg-muted-foreground/10 select-none cursor-pointer",
        actived ? "bg-muted-foreground/10" : "bg-transparent",
      )}
      onClick={() => onClick(id)}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 font-bold text-sm">{content}</div>
      </div>
    </div>
  );
}
