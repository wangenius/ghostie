import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onValueChange"> {
  variant?: "default" | "title" | "ghost" | "background" | "dust";
  onValueChange?: (data: string) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, onValueChange: onChange, ...props }, ref) => {
    return (
      <input
        type={type}
        data-vaul-no-drag
        placeholder={"输入"}
        autoComplete="off"
        className={cn(
          "flex h-9 w-full rounded-md px-3 py-2 text-sm  file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none bg-muted focus:bg-muted-foreground/10 transition disabled:cursor-not-allowed disabled:opacity-50",
          variant === "title" &&
            "text-2xl font-bold my-0 py-3 border-none outline-none focus:outline-none h-auto block focus:border-none bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent  focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:ring-0",
          variant === "ghost" &&
            "p-1 m-0 text-base font-medium border-none outline-none focus:outline-none h-auto block focus:border-none bg-transparent hover:bg-transparent active:bg-transparent  focus-visible:ring-offset-0 focus:bg-transparent focus-visible:outline-none focus-visible:ring-0",
          variant === "background" &&
            "p-2 m-0 h-8 text-xs rounded-md font-medium border-none outline-none focus:outline-none block focus:border-none bg-background hover:bg-background/80 active:bg-background/80  focus-visible:ring-offset-0 focus:bg-background/80 focus-visible:outline-none focus-visible:ring-0",
          variant === "dust" &&
            "p-2 m-0 h-8 text-xs rounded-md font-medium border-none outline-none focus:outline-none block focus:border-none bg-foreground/5 hover:bg-foreground/10 active:bg-foreground/10 focus-visible:ring-offset-0 focus:bg-foreground/10 focus-visible:outline-none focus-visible:ring-0",
          className,
        )}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
