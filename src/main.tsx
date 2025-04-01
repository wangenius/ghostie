import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SchedulerManager } from "./workflow/scheduler/SchedulerManager";
// 导入模型提供商索引，确保所有模型提供商都被注册
import "./model/llm";

const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
// 初始化工作流和调度器
const initManagers = async () => {
  try {
    // 初始化定时任务
    await SchedulerManager.initScheduledTasks();
  } catch (error) {
    console.error("初始化失败:", error);
  }
};

initManagers();
