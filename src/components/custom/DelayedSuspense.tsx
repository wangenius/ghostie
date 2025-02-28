import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * DelayedSuspense 组件用于提供一个优雅的加载状态过渡效果。
 *
 * 主要功能：
 * 1. 确保加载状态至少显示一定时间，避免闪烁
 * 2. 提供平滑的动画过渡效果
 * 3. 支持 React Suspense 异步加载
 *
 * 使用场景：
 * 1. 数据加载时显示 loading 状态
 * 2. 异步组件加载时显示过渡状态
 * 3. 需要平滑切换的任何场景
 *
 * 使用示例：
 * ```tsx
 * // 基础用法
 * <DelayedSuspense fallback={<LoadingSpin />}>
 *   <YourComponent />
 * </DelayedSuspense>
 *
 * // 自定义延迟时间
 * <DelayedSuspense
 *   fallback={<LoadingSpin />}
 *   minDelay={500}
 *   className="your-class"
 * >
 *   <YourComponent />
 * </DelayedSuspense>
 *
 * // 与 React.lazy 配合使用
 * const LazyComponent = React.lazy(() => import('./LazyComponent'));
 * <DelayedSuspense fallback={<LoadingSpin />}>
 *   <LazyComponent />
 * </DelayedSuspense>
 * ```
 */
interface DelayedSuspenseProps {
  /** 加载状态时显示的内容 */
  fallback: React.ReactNode;
  /** 最小延迟时间(ms)，确保加载状态至少显示这么长时间，默认 200ms */
  minDelay?: number;
  /** 实际要显示的内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

export const DelayedSuspense: React.FC<DelayedSuspenseProps> = ({
  fallback,
  minDelay = 200,
  children,
  className,
}) => {
  // 控制是否应该渲染实际内容
  const [shouldRender, setShouldRender] = useState(false);
  // 记录组件挂载时间，用于计算剩余延迟
  const mountedTime = useRef(Date.now());

  useEffect(() => {
    // 计算从组件挂载到现在已经过去的时间
    const elapsedTime = Date.now() - mountedTime.current;
    // 计算还需要等待的时间，确保总显示时间不少于 minDelay
    const remainingDelay = Math.max(0, minDelay - elapsedTime);

    // 设置定时器，在延迟结束后显示实际内容
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, remainingDelay);

    // 清理定时器，避免内存泄漏
    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  return (
    // 使用 React.Suspense 处理异步加载
    <Suspense fallback={fallback}>
      {/* AnimatePresence 确保退出动画能够播放完成 */}
      <AnimatePresence mode="wait">
        <motion.div
          // 根据渲染状态设置不同的 key，触发动画
          key={shouldRender ? "content" : "loading"}
          // 定义进入和退出动画
          variants={{
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
          }}
          initial={{ opacity: 0, y: 20 }}
          animate="enter"
          exit="exit"
          className={cn("w-full h-full flex-1 flex overflow-hidden", className)}
        >
          {/* 根据状态显示加载中或实际内容 */}
          {shouldRender ? children : fallback}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};
