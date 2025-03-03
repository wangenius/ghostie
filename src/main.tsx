import { createRoot } from "react-dom/client";
import "@/assets/globals.css";
import "@/assets/variables.css";
import App from "./App";
import { WorkflowManager } from "./workflow/WorkflowManager";
import { SchedulerManager } from "./workflow/scheduler/SchedulerManager";

/* 渲染 */
const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);
// 初始化工作流和调度器
const initManagers = async () => {
  try {
    // 初始化工作流管理器
    await WorkflowManager.init();
    // 初始化定时任务
    await SchedulerManager.initScheduledTasks();
    console.log("工作流和调度器初始化完成");
  } catch (error) {
    console.error("初始化失败:", error);
  }
};

initManagers();
