import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BotEdit } from "./components/popup/BotEdit";
import { ModelEdit } from "./components/popup/ModelEdit";
import { MainView } from "./windows/main/MainView";
import { SettingsPage } from "./windows/settings/SettingsPage";

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
                </Routes>
            </BrowserRouter>
        </div>


    );
}

export default App;
