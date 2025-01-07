import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainView } from "./components/MainView";
import { ModelEdit } from "./components/popup/ModelEdit";
import { BotEdit } from "./components/popup/BotEdit";
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AgentEdit } from "./components/popup/AgentEdit";
import { PluginEdit } from "./components/popup/PluginEdit";

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
        <Route path="/model-edit" element={<ModelEdit />} />
        <Route path="/bot-edit" element={<BotEdit />} />
        <Route path="/agent-edit" element={<AgentEdit />} />
        <Route path="/plugin-edit" element={<PluginEdit />} />
      </Routes>
    </Router>
  );
}

export default App;