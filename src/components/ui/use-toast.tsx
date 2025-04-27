// 简单的Toast通知组件
import { createContext, useContext, useState } from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);

    // 自动移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, props.duration || 5000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md p-4 shadow-md transition-all ${
              toast.variant === "destructive"
                ? "bg-red-100 text-red-800"
                : toast.variant === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-white text-gray-800"
            }`}
          >
            {toast.title && <div className="font-medium">{toast.title}</div>}
            {toast.description && (
              <div className="text-sm">{toast.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// 直接导出 toast 函数，方便在组件外部使用
let globalToast: (props: ToastProps) => void;

export function setGlobalToast(toast: (props: ToastProps) => void) {
  globalToast = toast;
}

export function toast(props: ToastProps) {
  if (!globalToast) {
    console.warn("Toast provider not initialized. Call setGlobalToast first.");
    return;
  }
  globalToast(props);
}
