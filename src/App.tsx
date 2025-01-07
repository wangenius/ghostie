import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainView } from "./components/MainView";
import { ModelAdd } from "./components/popup/ModelAdd";
import { BotAdd } from "./components/popup/BotAdd";
import { ModelEdit } from "./components/popup/ModelEdit";
import { BotEdit } from "./components/popup/BotEdit";
import { AgentAdd } from "./components/popup/AgentAdd";
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AgentEdit } from "./components/popup/AgentEdit";

function App() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        invoke('hide_window');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/model-add" element={<ModelAdd />} />
        <Route path="/bot-add" element={<BotAdd />} />
        <Route path="/model-edit" element={<ModelEdit />} />
        <Route path="/bot-edit" element={<BotEdit />} />
        <Route path="/agent-add" element={<AgentAdd />} />
        <Route path="/agent-edit" element={<AgentEdit />} />
      </Routes>
    </Router>
  );
}

export default App;