import { useEffect } from "react";
import { BotEditor } from "./bot/BotEditor";
import { HistoryPage } from "./page/history/HistoryPage";
import { MainView } from "./page/main/MainView";
import { EnvEditor } from "./plugin/EnvEditor";
import { PluginEditor } from "./plugin/PluginEditor";
import { SettingsManager } from "./settings/SettingsManager";
import { SettingsPage } from "./settings/SettingsPage";
import { Page } from "./utils/PageRouter";

/* 主应用,提供路由 */
function App() {
  const theme = SettingsManager.use((selector) => selector.theme);
  const font = SettingsManager.use((selector) => selector.font);
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
    <div
      data-theme={theme.name}
      data-font={font.name}
      id="app"
      className="h-full w-full bg-background"
    >
      <Page name="main" component={<MainView />} />
      <Page name="settings" component={<SettingsPage />} />
      <Page name="bot" component={<BotEditor />} />
      <Page name="plugin" component={<PluginEditor />} />
      <Page name="env" component={<EnvEditor />} />
      <Page name="history" component={<HistoryPage />} />
    </div>
  );
}

export default App;
