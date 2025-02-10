import { createRoot } from "react-dom/client";
import "./@styles/globals.css";
import App from "./App";
import { SettingsManager } from "./services/settings/SettingsManager";

document.documentElement.setAttribute('data-theme', SettingsManager.getTheme());
const element = document.getElementById("root") as HTMLElement;


createRoot(element).render(<App />);
