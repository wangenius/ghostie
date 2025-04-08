import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import "./model/embedding/provider";
import "./model/chat/provider";
import "./model/audio/provider";
import "./model/image/provider";
import "./model/vision/provider";
import "./agent/engine/mode";
import App from "./page/App";

const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
