import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BotEdit } from "./page/edit/BotEdit";
import { ModelEdit } from "./page/edit/ModelEdit";
import { ToolEdit } from "./page/edit/ToolEdit";
import { MainView } from "./page/main/MainView";
import { SettingsPage } from "./page/settings/Page";
import { SettingsManager } from "./services/settings/SettingsManager";
import { PackageManager } from "./page/package/packageManager";

/* 主应用,提供路由 */
function App() {
    const theme = SettingsManager.use(selector => selector.theme);
    return (
        <div data-theme={theme} className="h-full w-full bg-background">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/model-edit" element={<ModelEdit />} />
                    <Route path="/bot-edit" element={<BotEdit />} />
                    <Route path="/plugin-edit" element={<ToolEdit />} />
                    <Route path="/package-manager" element={<PackageManager />} />
                </Routes>
            </BrowserRouter>
        </div>


    );
}

export default App;
