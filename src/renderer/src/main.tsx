/**
 * Ghostie 应用主入口文件
 * 负责应用的初始化和渲染
 */

import "@/assets/globals.css";
import "@/assets/variables.css";
import { createRoot } from "react-dom/client";
import { PiCheck, PiInfo, PiWarning, PiXCircle } from "react-icons/pi";
import { TbLoader2 } from "react-icons/tb";
import { Toaster } from "sonner";

// 导入各个模块的初始化
import "./agent/engine/mode";
import "./model/audio/provider";
import "./model/chat/provider";
import "./model/embedding/provider";
import "./model/image/provider";
import "./model/vision/provider";
import "./skills/instance";

// 导入主要组件和服务
import App from "./page/App";
import { Scheduler } from "./page/schedule/Scheduler";
import { UserMananger } from "./services/user/User";

/**
 * 渲染主应用组件
 * 创建 React 根节点并渲染应用
 */
const element = document.getElementById("root") as HTMLElement;
createRoot(element).render(<App />);

/**
 * 渲染提示组件
 * 创建独立的 React 根节点用于显示全局提示
 */
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

/**
 * 初始化调度器
 * 启动定时任务和调度功能
 */
Scheduler.init();

/**
 * 初始化用户管理器
 * 检查用户状态和权限
 */
UserMananger.init();
