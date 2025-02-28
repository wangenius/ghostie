import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
  className?: string;
  dark?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  initialExpanded = false,
  className,
  dark = false,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderValue = (value: any, path: string) => {
    if (value === null)
      return (
        <span
          className={cn(
            "font-medium",
            dark ? "text-rose-400" : "text-rose-500",
          )}
        >
          null
        </span>
      );
    if (value === undefined)
      return (
        <span
          className={cn(
            "font-medium",
            dark ? "text-rose-400" : "text-rose-500",
          )}
        >
          undefined
        </span>
      );
    if (typeof value === "boolean")
      return (
        <span
          className={cn(
            "font-medium",
            dark ? "text-amber-300" : "text-amber-600",
          )}
        >
          {String(value)}
        </span>
      );
    if (typeof value === "number")
      return (
        <span
          className={cn("font-medium", dark ? "text-sky-300" : "text-sky-600")}
        >
          {value}
        </span>
      );
    if (typeof value === "string")
      return (
        <span
          className={cn(
            "font-medium",
            dark ? "text-emerald-300" : "text-emerald-600",
          )}
        >
          "{value}"
        </span>
      );

    const isArray = Array.isArray(value);
    const isExpanded = expanded[path] ?? initialExpanded;
    const isEmpty = Object.keys(value).length === 0;
    const itemCount = Object.keys(value).length;

    if (isEmpty) {
      return (
        <span
          className={cn(
            "opacity-60",
            dark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {isArray ? "[]" : "{}"}
        </span>
      );
    }

    return (
      <div
        className={cn(
          "group/item",
          dark ? "before:bg-slate-700/50" : "before:bg-slate-200/80",
        )}
      >
        <div
          onClick={() => toggleExpand(path)}
          className={cn(
            "inline-flex items-center gap-2 cursor-pointer h-6 overflow-hidden",
            "hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-2.5 py-1",
            "transition-all duration-200 ease-out",
            "select-none",
          )}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(dark ? "text-slate-300" : "text-slate-700")}>
              {isArray ? "[" : "{"}
            </span>
            <span
              className={cn(
                "text-[9px] font-medium px-2 h-4 rounded-full transition-colors whitespace-nowrap",
                dark
                  ? "bg-slate-800/80 text-slate-400 group-hover/item:bg-slate-700/80 group-hover/item:text-slate-300"
                  : "bg-slate-100/80 text-slate-500 group-hover/item:bg-slate-200/80 group-hover/item:text-slate-600",
              )}
            >
              {itemCount} {isArray ? "items" : "properties"}
            </span>
            {!isExpanded && (
              <span className={cn(dark ? "text-slate-300" : "text-slate-700")}>
                {isArray ? "]" : "}"}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="py-2 space-y-1">
                {Object.entries(value).map(([key, val], index) => (
                  <div
                    key={key}
                    className="flex items-start group/entry justify-start"
                  >
                    <span
                      className={cn(
                        "font-medium",
                        dark ? "text-violet-300" : "text-violet-600",
                      )}
                    >
                      {isArray ? index : key}
                    </span>
                    <span
                      className={cn(
                        "mx-1",
                        dark ? "text-slate-500" : "text-slate-400",
                      )}
                    >
                      :
                    </span>
                    <div className="flex-1 justify-start">
                      {renderValue(val, `${path}.${key}`)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isExpanded && (
          <div className="flex items-start text-xs">
            <span className={cn(dark ? "text-slate-300" : "text-slate-700")}>
              {isArray ? "]" : "}"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "font-mono text-sm leading-relaxed",
        dark ? "bg-slate-900/95" : "bg-white",
        "rounded-2xl",
        "shadow-xl shadow-slate-200/20 dark:shadow-slate-900/30",
        "w-full max-w-2xl max-h-[500px]",
        "backdrop-blur-sm",
        "overflow-auto",
        "scrollbar-thin scrollbar-track-transparent",
        dark
          ? "scrollbar-thumb-slate-700/60 hover:scrollbar-thumb-slate-600/80"
          : "scrollbar-thumb-slate-200/80 hover:scrollbar-thumb-slate-300/80",
        className,
      )}
    >
      <div className="p-2">
        <div className="inline-block min-w-0">{renderValue(data, "root")}</div>
      </div>
    </div>
  );
};

export default JsonViewer;
