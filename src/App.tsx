import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainView } from "./components/MainView";
import { ModelAdd } from "./components/ModelAdd";
import { RoleAdd } from "./components/RoleAdd";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/model-add" element={<ModelAdd />} />
        <Route path="/role-add" element={<RoleAdd />} />
      </Routes>
    </Router>
  );
}

export default App;
