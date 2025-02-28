import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export interface QueryState<T = string> {
  value: T;
  isLoading: boolean;
  error: Error | null;
  setValue: (value: T) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
}

export function useQuery<T = string>(key: string): QueryState<T> {
  const [value, setValue] = useState<T>("" as T);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unlisten = listen<Record<string, T>>("window-params", (event) => {
      const params = event.payload;
      if (params && params[key]) {
        setValue(params[key]);
      }
    });

    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, [key]);

  console.log(value);

  return {
    value,
    isLoading,
    error,
    setValue,
    setLoading,
    setError,
  };
}
