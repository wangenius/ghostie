import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BotEditor } from "./bot/BotEditor";
import { ModelEditor } from "./model/ModelEditor";
import { PluginEditor } from "./plugin/PluginEditor";
import { MainView } from "./page/main/MainView";
import { SettingsPage } from "./settings/SettingsPage";
import { SettingsManager } from "./settings/SettingsManager";
import { useEffect } from "react";
import { EnvEditor } from "./plugin/EnvEditor";
import { HistoryPage } from "./page/history/HistoryPage";
import { KnowledgeCreator } from "./knowledge/KnowledgeCreator";
import { KnowledgePreview } from "./knowledge/KnowledgePreview";
import { WorkflowEditor } from "./workflow/WorkflowEditor";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainView />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/model-edit" element={<ModelEditor />} />
          <Route path="/bot-edit" element={<BotEditor />} />
          <Route path="/plugin-edit" element={<PluginEditor />} />
          <Route path="/env-edit" element={<EnvEditor />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/knowledge-creator" element={<KnowledgeCreator />} />
          <Route path="/knowledge-preview" element={<KnowledgePreview />} />
          <Route path="/workflow-edit" element={<WorkflowEditor />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
