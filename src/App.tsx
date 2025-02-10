import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BotEdit } from "./page/edit/BotEdit";
import { ModelEdit } from "./page/edit/ModelEdit";
import { MainView } from "./page/main/MainView";
import { SettingsPage } from "./page/settings/Page";
import { PluginEdit } from "./page/edit/PluginEdit";

/* 主应用,提供路由 */
function App() {
    return (
        <div className="h-full w-full bg-background">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/model-edit" element={<ModelEdit />} />
                    <Route path="/bot-edit" element={<BotEdit />} />
                    <Route path="/plugin-edit" element={<PluginEdit />} />
                </Routes>
            </BrowserRouter>
        </div>


    );
}

export default App;
