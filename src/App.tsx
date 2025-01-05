import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainView } from "./components/MainView";
import { ModelAdd } from "./components/ModelAdd";
import { BotAdd } from "./components/BotAdd";
import { ModelEdit } from "./components/ModelEdit";
import { BotEdit } from "./components/BotEdit";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/model-add" element={<ModelAdd />} />
        <Route path="/bot-add" element={<BotAdd />} />
        <Route path="/model-edit" element={<ModelEdit />} />
        <Route path="/bot-edit" element={<BotEdit />} />
      </Routes>
    </Router>
  );
}

export default App;