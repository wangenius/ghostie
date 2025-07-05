import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { TbCopy } from "react-icons/tb";
import { Components } from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
// 导入常用的语言支持
import jsx from "react-syntax-highlighter/dist/cjs/languages/prism/jsx";
import javascript from "react-syntax-highlighter/dist/cjs/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/cjs/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/cjs/languages/prism/python";
import bash from "react-syntax-highlighter/dist/cjs/languages/prism/bash";
import css from "react-syntax-highlighter/dist/cjs/languages/prism/css";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/cjs/languages/prism/markdown";
import html from "react-syntax-highlighter/dist/cjs/languages/prism/markup";

// 注册语言
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("html", html);

export const iconVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export const CodeBlock: Components["code"] = ({
  className,
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || "");
  const isInline = !match;
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopy = () => {
    if (typeof children === "string") {
      navigator.clipboard.writeText(children);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    }
  };

  return !isInline ? (
    <div className="relative my-4 code">
      <div className="rounded-xl border bg-[#282c34] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-[#393939] bg-[#21252b]">
          <span className="text-xs text-zinc-400 font-medium">{match[1]}</span>

          <Button
            variant="ghost"
            className="hover:bg-muted-foreground/30 hover:text-muted/80"
            size="icon"
            onClick={handleCopy}
          >
            {codeCopied ? (
              <motion.div
                key="success"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-emerald-400"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </motion.div>
            ) : (
              <TbCopy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <div className="p-4 select-text">
          <SyntaxHighlighter
            language={match[1]}
            PreTag="div"
            className="!bg-transparent !p-0 !m-0  !select-text"
            style={oneDark}
            customStyle={{
              background: "transparent",
              padding: 0,
              margin: 0,
              fontSize: "13px",
              lineHeight: "1.6",
              userSelect: "text",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  ) : (
    <code
      className={cn(
        "px-[.4em] py-[.1em] rounded-[6px] font-mono text-[13px]",
        "bg-muted-foreground/10",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
};
