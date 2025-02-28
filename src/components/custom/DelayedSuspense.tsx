import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DelayedSuspenseProps {
  fallback: React.ReactNode;
  minDelay?: number;
  children: React.ReactNode;
  className?: string;
}

const fadeVariants = {
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

export const DelayedSuspense: React.FC<DelayedSuspenseProps> = ({
  fallback,
  minDelay = 1000,
  children,
  className,
}) => {
  const [canShow, setCanShow] = useState(false);
  const [startDelay, setStartDelay] = useState(false);

  // 当子组件准备好时开始计时
  useEffect(() => {
    setStartDelay(true);
  }, [children]);

  // 当开始计时且达到最小延迟时显示内容
  useEffect(() => {
    if (!startDelay) return;

    const timer = setTimeout(() => {
      setCanShow(true);
    }, minDelay);

    return () => clearTimeout(timer);
  }, [minDelay, startDelay]);

  return (
    <Suspense
      fallback={
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {fallback}
        </motion.div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={canShow ? "content" : "loading"}
          variants={fadeVariants}
          initial={{ opacity: 0, y: 20 }}
          animate="enter"
          exit="exit"
          className={cn("w-full h-full flex-1 flex overflow-hidden", className)}
        >
          {canShow ? children : fallback}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};
