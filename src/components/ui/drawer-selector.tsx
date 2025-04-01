import { cn } from "@/lib/utils";
import { useState } from "react";
import { TbCheck, TbSelector, TbTrash, TbX } from "react-icons/tb";
import { Button } from "./button";
import { Drawer } from "./drawer";

export interface DrawerSelectorItem {
  label: string;
  value: any;
  description?: string | React.ReactNode;
  type?: string;
  variant?: "default" | "danger";
}

interface DrawerSelectorProps {
  title?: string;
  panelTitle?: string;
  value: any[];
  items: DrawerSelectorItem[];
  onSelect: (value: any[]) => void;
  renderTrigger?: (
    selectedItems: DrawerSelectorItem[],
    setOpen: (open: boolean) => void,
  ) => React.ReactNode;
  placeholder?: string;
  multiple?: boolean;
}

export function DrawerSelector({
  title,
  panelTitle,
  value = [],
  items,
  onSelect,
  renderTrigger,
  placeholder = "unselected",
  multiple = false,
}: DrawerSelectorProps) {
  const [open, setOpen] = useState(false);

  // 检查项目是否被选中
  const isItemSelected = (itemValue: any) => {
    return value.some((v) =>
      typeof v === "object"
        ? JSON.stringify(v) === JSON.stringify(itemValue)
        : v === itemValue,
    );
  };

  const selectedItems = items.filter((item) => isItemSelected(item.value));

  // 按 type 对项目进行分组
  const groupedItems = items.reduce((groups, item) => {
    const type = item.type || "default";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, DrawerSelectorItem[]>);

  // 处理选择事件
  const handleSelect = (selectedValue: any) => {
    if (multiple) {
      const newValues = value.some((v) =>
        typeof v === "object"
          ? JSON.stringify(v) === JSON.stringify(selectedValue)
          : v === selectedValue,
      )
        ? value.filter((v) =>
            typeof v === "object"
              ? JSON.stringify(v) !== JSON.stringify(selectedValue)
              : v !== selectedValue,
          )
        : [...value, selectedValue];
      onSelect(newValues);
    } else {
      onSelect([selectedValue]);
      setOpen(false);
    }
  };

  // 处理单个项目删除
  const handleRemoveItem = (itemValue: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValues = value.filter((v) =>
      typeof v === "object"
        ? JSON.stringify(v) !== JSON.stringify(itemValue)
        : v !== itemValue,
    );
    onSelect(newValues);
  };

  return (
    <div className="space-y-2">
      {renderTrigger ? (
        renderTrigger(selectedItems, setOpen)
      ) : title ? (
        <div className="w-full bg-muted-foreground/5 p-2 rounded-xl space-y-2">
          <div className="w-full justify-between flex items-center gap-2">
            <div className="text-sm font-medium pl-2">{title}</div>
            <Button
              onClick={() => setOpen(true)}
              className={cn(
                "relative flex items-center p-3 rounded-lg h-8 transition-all",
                !multiple && selectedItems[0]?.variant === "danger"
                  ? "bg-red-50 hover:bg-red-100 hover:text-red-600 text-red-600"
                  : "bg-muted-foreground/5 hover:bg-muted-foreground/10",
              )}
            >
              <TbSelector className="w-4 h-4" />
              {multiple
                ? `已选择 ${selectedItems.length} 项`
                : selectedItems.length > 0
                ? selectedItems[0].label
                : placeholder}
            </Button>
          </div>

          {multiple && selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {selectedItems.map((item) => (
                <div
                  key={item.value}
                  className={cn(
                    "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    item.variant === "danger"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-accent/80 hover:bg-accent text-accent-foreground",
                  )}
                >
                  <span className="truncate max-w-[120px]">{item.label}</span>
                  {item.type && (
                    <span
                      className={cn(
                        "text-[10px]",
                        item.variant === "danger"
                          ? "text-red-500"
                          : "text-accent-foreground/60",
                      )}
                    >
                      {item.type}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleRemoveItem(item.value, e)}
                    className={cn(
                      "p-0.5 rounded-full",
                      item.variant === "danger"
                        ? "hover:bg-red-200"
                        : "hover:bg-accent-foreground/10",
                    )}
                  >
                    <TbX className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full rounded-lg space-y-2">
          <Button
            onClick={() => setOpen(true)}
            className={cn(
              "w-full relative flex items-center p-2 h-9 transition-all",
              !multiple && selectedItems[0]?.variant === "danger"
                ? "bg-red-50 hover:bg-red-100 hover:text-red-600 text-red-600"
                : "bg-muted-foreground/5 hover:bg-muted-foreground/10",
            )}
          >
            <TbSelector className="w-4 h-4" />
            <div className="flex-1 truncate flex gap-1 justify-between">
              <span className="text-xs px-1 rounded-md py-0.5 ">
                {multiple
                  ? `已选择 ${selectedItems.length} 项`
                  : selectedItems.length > 0
                  ? selectedItems[0].label
                  : placeholder}
              </span>

              {selectedItems[0]?.type && (
                <span className="text-xs text-muted-foreground/60 bg-muted-foreground/10 px-1 rounded-md py-0.5 line-clamp-1">
                  {selectedItems[0]?.type}
                </span>
              )}
            </div>
          </Button>

          {multiple && selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {selectedItems.map((item) => (
                <div
                  key={item.value}
                  className={cn(
                    "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    item.variant === "danger"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-accent/80 hover:bg-accent text-accent-foreground",
                  )}
                >
                  <span className="truncate max-w-[120px]">{item.label}</span>
                  {item.type && (
                    <span
                      className={cn(
                        "text-[10px]",
                        item.variant === "danger"
                          ? "text-red-500"
                          : "text-accent-foreground/60",
                      )}
                    >
                      {item.type}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleRemoveItem(item.value, e)}
                    className={cn(
                      "p-0.5 rounded-full",
                      item.variant === "danger"
                        ? "hover:bg-red-200"
                        : "hover:bg-accent-foreground/10",
                    )}
                  >
                    <TbX className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{panelTitle || title}</h3>
            <div>
              {multiple && selectedItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelect([])}
                >
                  <TbTrash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        }
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground text-sm">No options</div>
          </div>
        ) : (
          Object.entries(groupedItems).map(([type, typeItems]) => (
            <div key={type} className="mb-4 space-y-2">
              <div className="text-sm font-bold text-muted-foreground px-3">
                {type}
              </div>
              {typeItems.map((item) => (
                <div
                  key={item.value}
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 m-0 rounded-lg text-left transition-colors",
                    item.variant === "danger"
                      ? isItemSelected(item.value)
                        ? "bg-red-100 text-red-700"
                        : "bg-card hover:bg-red-50"
                      : isItemSelected(item.value)
                      ? "bg-accent"
                      : "bg-card hover:bg-accent",
                  )}
                >
                  <div>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        item.variant === "danger" && "text-red-600",
                      )}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div
                        className={cn(
                          "text-xs line-clamp-2",
                          item.variant === "danger"
                            ? "text-red-500/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  {isItemSelected(item.value) && (
                    <TbCheck
                      className={cn(
                        "h-4 w-4 flex-none",
                        item.variant === "danger" && "text-red-600",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}
