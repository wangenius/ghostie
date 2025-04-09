import {
  forwardRef,
  TextareaHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  ReactNode,
  ChangeEventHandler,
} from "react";
import { cn } from "@/lib/utils";

export interface CustomTextAreaRef {
  focus: () => void;
  blur: () => void;
  dom: HTMLTextAreaElement | null;
}

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "onValueChange"
> & {
  onChange?: ChangeEventHandler<HTMLTextAreaElement> | undefined;
  variant?: "secondary" | "ghost" | "dust";
  footer?: ReactNode;
};

export const Textarea = forwardRef<CustomTextAreaRef, TextAreaProps>(
  (props, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const [footerHeight, setFooterHeight] = useState(0);

    const {
      className,
      onChange,
      defaultValue,
      value: controlledValue,
      footer,
      style,
      ...rest
    } = props;

    const [internalValue, setInternalValue] = useState(defaultValue || "");

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    useEffect(() => {
      const updateFooterHeight = () => {
        if (footerRef.current) {
          const newHeight = footerRef.current.offsetHeight;
          if (newHeight !== footerHeight) {
            setFooterHeight(newHeight);
          }
        }
      };

      updateFooterHeight();

      if (footerRef.current) {
        const observer = new MutationObserver(updateFooterHeight);
        observer.observe(footerRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
        });
        return () => observer.disconnect();
      }
    }, [footer]);

    useEffect(() => {
      if (defaultValue !== undefined) {
        setInternalValue(defaultValue);
      }
    }, [defaultValue]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => internalRef.current?.focus(),
        blur: () => internalRef.current?.blur(),
        dom: internalRef.current,
      }),
      [],
    );

    return (
      <div className="relative h-full p">
        <textarea
          ref={internalRef}
          value={value}
          onChange={(e) => {
            if (!isControlled) {
              setInternalValue(e.target.value);
            }
            onChange?.(e);
          }}
          className={cn(
            "flex w-full rounded-2xl px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/70 text-muted-foreground focus-visible:outline-none bg-muted-foreground/5 disabled:cursor-not-allowed disabled:opacity-50",
            rest.variant === "secondary" &&
              "bg-muted outline-none focus-visible:outline-none border-none focus-visible:ring-0",
            rest.variant === "ghost" &&
              "p-1 m-0 text-base border-none outline-none focus:outline-none h-auto block focus:border-none bg-transparent hover:bg-transparent active:bg-transparent focus-visible:ring-offset-0 focus:bg-transparent focus-visible:outline-none focus-visible:ring-0",
            rest.variant === "dust" &&
              "p-1 m-0 text-base border-none outline-none focus:outline-none h-auto block focus:border-none bg-foreground/5 hover:bg-foreground/10 active:bg-foreground/10 focus-visible:ring-offset-0 focus:bg-foreground/10 focus-visible:outline-none focus-visible:ring-0",
            className,
          )}
          style={{
            ...style,
            paddingBottom: footer ? `${footerHeight + 16}px` : undefined,
          }}
          {...rest}
        />
        {footer && (
          <div
            ref={footerRef}
            className="absolute bottom-1 left-0 right-0 transition-all duration-200"
          >
            {footer}
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "TextArea";
