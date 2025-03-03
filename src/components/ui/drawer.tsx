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
}: {
  direction?: "right" | "left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DrawerPrimitive.Root
      direction={direction}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/40" />
        <DrawerPrimitive.Content
          className={cn(
            "right-2 top-2 bottom-2 fixed z-10 outline-none flex w-[320px]",
            className,
          )}
          // The gap between the edge of the screen and the drawer is 8px in this case.
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
