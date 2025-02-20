import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BotEdit } from "./page/edit/BotEdit";
import { ModelEdit } from "./page/edit/ModelEdit";
import { PluginEdit } from "./page/edit/PluginEdit";
import { MainView } from "./page/main/MainView";
import { SettingsPage } from "./page/settings/Page";
import { SettingsManager } from "./services/settings/SettingsManager";
import { useEffect } from "react";
import { EnvEdit } from "./page/edit/EnvEdit";
import { HistoryPage } from "./page/history/HistoryPage";
import { KnowledgeCreator } from "./page/history/KnowledgeCreator";

/* 主应用,提供路由 */
function App() {
    const theme = SettingsManager.use(selector => selector.theme);
    const font = SettingsManager.use(selector => selector.font);
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
        <div data-theme={theme.name} data-font={font.name} id="app" className="h-full w-full bg-background">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/model-edit" element={<ModelEdit />} />
                    <Route path="/bot-edit" element={<BotEdit />} />
                    <Route path="/plugin-edit" element={<PluginEdit />} />
                    <Route path="/env-edit" element={<EnvEdit />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/knowledge-creator" element={<KnowledgeCreator />} />
                </Routes>
            </BrowserRouter>
        </div>


    );
}

export default App;
