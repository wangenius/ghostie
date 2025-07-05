import { useEffect } from "react";
import { SettingsManager } from "../settings/SettingsManager";
import { MainView } from "./main/MainView";

/* 主应用,提供路由 */
function App() {
  const theme = SettingsManager.use((selector) => selector.theme);
  const font = SettingsManager.use((selector) => selector.font);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme.name);
    document.body.setAttribute("data-font", font.name);
  }, [theme, font]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === "r" && e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div id="app" className="h-full w-full bg-background">
      <MainView />
    </div>
  );
}

export default App;
