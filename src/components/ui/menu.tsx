import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { PiCaretRight } from "react-icons/pi";
import { Button } from "./button";

export interface MenuItemProps {
  label?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  type?: "item" | "divide" | "sub";
  danger?: boolean;
  items?: {
    label: string;
    onClick: () => void;
  }[];
  variant?: "default" | "destructive";
  active?: boolean;
}

export const Menu = ({
  items,
  afterClick,
  variant = "popover",
  children,
  focusIndex,
  className,
  style,
}: {
  children?: ReactNode;
  items?: (MenuItemProps | null)[];
  afterClick?: () => void;
  variant?: "default" | "popover";
  focusIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        variant == "default" && "shadow-none border-none",
        className,
      )}
      style={style}
    >
      {items ? (
        <div className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            if (!item) return null;
            if (item.type === "divide")
              return <div key={index} className="-mx-1 my-1 h-px bg-muted" />;
            if (item.type === "sub" && item.items) {
              return (
                <DropdownMenu key={index}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-lg px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        variant === "default" && "shadow-none",
                      )}
                      variant={"ghost"}
                    >
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      <span>{item.label}</span>
                      <PiCaretRight className="ml-auto h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" className="min-w-[8rem]">
                    {item.items.map((subItem, subIndex) => (
                      <DropdownMenuItem
                        key={subIndex}
                        onClick={() => {
                          subItem.onClick?.();
                          afterClick?.();
                        }}
                      >
                        {subItem.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return (
              <MenuItem
                variant={item.variant}
                key={index}
                onClick={() => {
                  item.onClick?.();
                  afterClick?.();
                }}
                className={cn(
                  focusIndex === index && "!bg-muted-foreground/10",
                )}
                icon={item.icon}
                label={item.label}
                active={item.active}
              />
            );
          })}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

function MenuItem(props: {
  icon?: React.ElementType;
  label?: string;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
  active?: boolean;
}) {
  const { label, className, onClick, variant, active } = props;
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs outline-none transition-colors focus:bg-accent text-primary focus:text-accent-foreground hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground hover:bg-accent/50",
        variant === "destructive" &&
          "text-destructive hover:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive [&_svg]:hover:text-destructive",
        className,
        active && "bg-accent text-accent-foreground",
      )}
    >
      {props.icon && (
        <props.icon
          className={cn(
            "h-4 w-4",
            variant === "destructive" &&
              "text-destructive hover:text-destructive",
          )}
        />
      )}
      {label}
    </div>
  );
}
