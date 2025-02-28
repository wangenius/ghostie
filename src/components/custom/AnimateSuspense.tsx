import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";
import React from "react";

interface AnimateSuspenseProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variants = {
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const AnimateSuspense: React.FC<AnimateSuspenseProps> = ({
  fallback,
  children,
  className,
}) => {
  return (
    <Suspense
      fallback={
        <motion.div
          key="loading"
          variants={variants}
          initial={{ opacity: 0, y: 20 }}
          animate="enter"
          exit="exit"
          className={cn("w-full h-full flex-1 flex overflow-hidden", className)}
        >
          {fallback}
        </motion.div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="content"
          variants={variants}
          initial={{ opacity: 0, y: 20 }}
          animate="enter"
          exit="exit"
          className={cn("w-full h-full flex-1 flex overflow-hidden", className)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};
