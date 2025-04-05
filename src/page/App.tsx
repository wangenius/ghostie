import { useEffect } from "react";
import { SettingsManager } from "../settings/SettingsManager";
import { Page } from "../utils/PageRouter";
import { HistoryPage } from "./history/HistoryPage";
import { MainView } from "./main/MainView";
import { SettingsPage } from "./settings/SettingsPage";

/* 主应用,提供路由 */
function App() {
  /* 主题 */
  const theme = SettingsManager.use((selector) => selector.theme);
  /* 字体 */
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

      if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        Page.to("main");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      data-theme={theme.name}
      data-font={font.name}
      id="app"
      className="h-full w-full bg-background"
    >
      <Page name="main" component={<MainView />} />
      <Page name="settings" component={<SettingsPage />} />
      <Page name="history" component={<HistoryPage />} />
    </div>
  );
}

export default App;
