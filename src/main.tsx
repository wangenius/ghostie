import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import "./model/embedding/llm";
import "./model/chat/llm";
import "./agent/engine/mode";
import "./model/vision/llm";
import App from "./page/App";

const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
