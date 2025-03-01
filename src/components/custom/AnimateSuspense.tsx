import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface AnimateSuspenseProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minDelay?: number;
  deps?: any[];
}

const variants = {
  initial: { opacity: 0, y: 20 },
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

const DelayedTransition: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  minDelay: number;
  className?: string;
  suspended: boolean;
}> = ({ children, fallback, minDelay, className, suspended }) => {
  const [shouldDelayContent, setShouldDelayContent] = useState(true);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!suspended) {
      const remainingTime = Math.max(
        0,
        minDelay - (Date.now() - startTimeRef.current),
      );
      const timer = setTimeout(() => {
        setShouldDelayContent(false);
      }, remainingTime);
      return () => clearTimeout(timer);
    } else {
      startTimeRef.current = Date.now();
      setShouldDelayContent(true);
    }
  }, [suspended, minDelay]);

  return (
    <AnimatePresence mode="wait">
      {suspended || shouldDelayContent ? (
        <motion.div
          key="fallback"
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
          className={cn(
            "flex-1 w-full h-full flex items-center justify-center",
            className,
          )}
        >
          {fallback}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
          className={cn("flex-1 w-full h-full flex overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SuspenseTracker: React.FC<{
  children: React.ReactNode;
  onSuspend: () => void;
  onResume: () => void;
}> = ({ children, onSuspend, onResume }) => {
  useEffect(() => {
    onResume();
    return () => onSuspend();
  }, [onSuspend, onResume]);

  return <>{children}</>;
};

export const AnimateSuspense: React.FC<AnimateSuspenseProps> = ({
  fallback,
  children,
  className,
  minDelay = 200,
  deps = [],
}) => {
  const [key, setKey] = useState(0);
  const [isSuspended, setIsSuspended] = useState(true);

  useEffect(() => {
    setKey((prev) => prev + 1);
    setIsSuspended(true);
  }, deps);

  const handleSuspend = useCallback(() => {
    setIsSuspended(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsSuspended(false);
  }, []);

  return (
    <Suspense
      key={key}
      fallback={
        <DelayedTransition
          minDelay={minDelay}
          fallback={fallback}
          className={className}
          suspended={true}
        >
          {null}
        </DelayedTransition>
      }
    >
      <SuspenseTracker onSuspend={handleSuspend} onResume={handleResume}>
        <DelayedTransition
          minDelay={minDelay}
          fallback={fallback}
          className={className}
          suspended={isSuspended}
        >
          {children}
        </DelayedTransition>
      </SuspenseTracker>
    </Suspense>
  );
};
