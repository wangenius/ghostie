import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import { PiCheck, PiInfo, PiWarning, PiXCircle } from "react-icons/pi";
import { TbLoader2 } from "react-icons/tb";
import { Toaster } from "sonner";
import "./agent/engine/mode";
import "./model/audio/provider";
import "./model/chat/provider";
import "./model/embedding/provider";
import "./model/image/provider";
import "./model/vision/provider";
import "./skills/instance";
import App from "./page/App";

const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);

const ToastProvider = document.getElementById("toast") as HTMLElement;
createRoot(ToastProvider).render(
  <Toaster
    visibleToasts={2}
    expand
    richColors
    icons={{
      success: <PiCheck className="text-green-500" />,
      info: <PiInfo className="text-blue-500" />,
      warning: <PiWarning className="text-yellow-500" />,
      error: <PiXCircle className="text-red-500" />,
      loading: <TbLoader2 className="text-gray-500" />,
    }}
  />,
);
