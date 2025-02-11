import { createRoot } from "react-dom/client";
import "@/assets/globals.css";
import App from "./App";


/* 渲染 */
const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
