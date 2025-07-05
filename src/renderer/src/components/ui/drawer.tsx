"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

export function Drawer({
  direction = "right",
  open,
  onOpenChange,
  children,
  className,
  trigger,
  title,
  description,
  modal = true,
}: {
  direction?: "right" | "left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  modal?: boolean;
}) {
  return (
    <DrawerPrimitive.Root
      direction={direction}
      open={open}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      {trigger && <DrawerPrimitive.Trigger>{trigger}</DrawerPrimitive.Trigger>}
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          aria-hidden="false"
          className={cn(
            "right-2 top-12 bottom-2 fixed z-10 outline-none flex w-[320px] ",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          onDrag={(e) => e.stopPropagation()}
          // The gap between the edge of the screen and the drawer is 8px in this case.
          style={
            { "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties
          }
        >
          <div className="bg-muted h-full w-full grow flex flex-col rounded-lg gap-1 pt-4">
            <div className="mx-auto mb-2 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/70 transition-colors " />
            <DrawerPrimitive.Title data-vaul-no-drag className="px-4 font-bold">
              {title}
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Description data-vaul-no-drag>
              {description}
            </DrawerPrimitive.Description>
            <div
              data-vaul-no-drag
              className="overflow-y-auto p-3 space-y-2 flex-1"
            >
              {children}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export function NestedDrawer({
  direction = "right",
  open,
  onOpenChange,
  children,
  className,
}: {
  direction?: "right" | "left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DrawerPrimitive.NestedRoot
      direction={direction}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/50" />
        <DrawerPrimitive.Content
          className={cn(
            "right-2 top-2 bottom-2 fixed z-10 outline-none flex w-[320px] shadow-lg",
            className,
          )}
          style={
            { "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties
          }
        >
          <DrawerPrimitive.Title className="sr-only"></DrawerPrimitive.Title>
          <DrawerPrimitive.Description className="sr-only"></DrawerPrimitive.Description>
          <div className="bg-zinc-50 h-full w-full grow p-5 flex flex-col rounded-lg">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.NestedRoot>
  );
}
