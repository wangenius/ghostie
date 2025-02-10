import { createRoot } from "react-dom/client";
import "@/assets/globals.css";
import App from "./App";
import { SettingsManager } from "@services/settings/SettingsManager";

/* 设置主题 */
document.documentElement.setAttribute('data-theme', SettingsManager.getTheme());

/* 渲染 */
const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
