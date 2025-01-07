import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { initTheme } from "./utils/theme";
import { BotManager } from "./services/BotManger";

// 初始化主题
initTheme();
BotManager.loadBots();
const element = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(element).render(
  <App />
);
