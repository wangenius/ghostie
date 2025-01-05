import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const element = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
