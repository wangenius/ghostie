import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { initTheme } from "./utils/theme";
import { BotManager } from "./services/BotManger";
import { AgentManager } from "./services/AgentManager";

// 初始化主题
initTheme();
BotManager.loadBots();
AgentManager.loadAgents();
const element = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(element).render(
  <App />
);
