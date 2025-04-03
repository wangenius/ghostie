import {
  useEffect,
  useRef,
  useState,
  ReactNode,
  forwardRef,
  useImperativeHandle,
  KeyboardEventHandler,
  ChangeEventHandler,
  ChangeEvent,
} from "react";
import { CustomTextAreaRef, Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  variant?: "ghost" | "secondary";
  className?: string;
  autoFocus?: boolean;
  minRow?: number;
  footer?: ReactNode;
  placeholder?: string;
}
const AutoResizeTextarea = forwardRef<
  CustomTextAreaRef,
  AutoResizeTextareaProps
>(
  (
    {
      defaultValue,
      value,
      onValueChange: onChange,
      variant,
      className,
      onKeyDown,
      autoFocus,
      minRow = 1,
      footer,
      ...props
    },
    ref,
  ) => {
    const textareaRef = useRef<CustomTextAreaRef>(null);
    const [minHeight, setMinHeight] = useState(0);
    const footerRef = useRef<HTMLDivElement>(null);
    const [footerHeight, setFooterHeight] = useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      blur: () => {
        textareaRef.current?.blur();
      },
      dom: textareaRef.current!.dom,
    }));

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
      if (textareaRef.current?.dom) {
        const style = window.getComputedStyle(textareaRef.current.dom);
        const lineHeight = parseInt(style.lineHeight, 10);
        const paddingTop = parseInt(style.paddingTop, 10);
        const paddingAgenttom = parseInt(style.paddingAgenttom, 10);
        setMinHeight(lineHeight * minRow + paddingTop + paddingAgenttom);
      }
    }, [minRow]);

    const adjustHeight = () => {
      const textarea = textareaRef.current?.dom;
      if (textarea) {
        const scrollPos = window.scrollY;
        textarea.style.height = "auto";
        const newHeight = Math.max(textarea.scrollHeight, minHeight);
        textarea.style.height = `${newHeight}px`;
        window.scrollTo(0, scrollPos);
      }
    };

    useEffect(() => {
      adjustHeight();
      const handleResize = () => adjustHeight();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    };

    return (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          defaultValue={defaultValue}
          value={value}
          onChange={handleChange}
          onInput={!onChange ? adjustHeight : undefined}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          style={{
            resize: "none",
            overflow: "hidden",
            minHeight: `${minHeight}px`,
            paddingAgenttom: footer ? `${footerHeight + 12}px` : undefined,
          }}
          variant={variant}
          className={cn(
            variant === "ghost"
              ? "m-0 text-base outline-none focus:outline-none h-auto block"
              : "",
            footer && "pb-12",
            className,
          )}
          {...props}
        />
        {footer && (
          <div ref={footerRef} className="absolute agenttom-0 left-0 right-0">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

export default AutoResizeTextarea;
