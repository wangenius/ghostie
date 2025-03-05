import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { TbChevronDown } from "react-icons/tb";

interface CustomSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  placeholder?: string;
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = "请选择...",
}: CustomSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex w-full items-start justify-between rounded-md p-2 text-sm",
          "bg-muted-foreground transition-colors",
          value ? "hover:bg-muted-foreground/20" : "hover:bg-primary/10",
          value
            ? "bg-muted-foreground/10"
            : "bg-background hover:bg-primary/10",
          "focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[52px]",
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {selectedOption ? (
            <div className="flex flex-col items-start gap-0.5">
              <div className="font-medium text-sm">{selectedOption.label}</div>
              {selectedOption.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {selectedOption.description}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">{placeholder}</div>
          )}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <TbChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 mt-1" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "w-[var(--radix-select-trigger-width)]",
          )}
          position="popper"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex flex-col w-full cursor-default select-none items-start rounded-md p-2 outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  "data-[state=checked]:bg-primary/90 data-[state=checked]:text-primary-foreground data-[state=checked]:hover:bg-primary",
                )}
              >
                <SelectPrimitive.ItemText>
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {option.description}
                    </div>
                  )}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
