import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useQuery(key: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const unlisten = listen<Record<string, string>>(
      "window-params",
      (event) => {
        const params = event.payload;
        if (params && params[key]) {
          setValue(params[key]);
        }
      },
    );

    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, [key]);

  console.log(value);

  return {
    value,
    setValue,
  };
}
