import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./model/text/llm";
import "./model/embedding/llm";
const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
