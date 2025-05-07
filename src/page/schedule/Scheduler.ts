import { Toolkit } from "@/toolkit/Toolkit";
import { AgentManager } from "@/store/AgentManager";
import { Echo, LocalEcho } from "echo-state";
import { toast } from "sonner";
import { Tickie } from "tickie";
import { Workflow } from "../../workflow/Workflow";

/**
 * 执行历史记录
 */
export interface ExecutionHistory {
  /** 执行时间 */
  timestamp: number;
  /** 执行状态 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 执行类型 */
  type: "workflow" | "plugin" | "agent";
  /** 执行对象ID */
  targetId: string;
  /** 执行对象名称 */
  targetName: string;
  /** 执行结果 */
  result?: any;
}

// 执行历史存储常量
export const SCHEDULE_HISTORY_DATABASE = "scheduler_history";

export const ScheduleHistoryStore = new Echo<Record<string, ExecutionHistory>>(
  {},
).indexed({
  database: SCHEDULE_HISTORY_DATABASE,
  name: "",
});

/**
 * 计划任务结构
 */
export interface Schedule {
  /** 计划ID */
  id: string;
  /** 计划名称 */
  name: string;
  /** 计划类型 */
  type: "workflow" | "plugin" | "agent";
  /** Cron表达式 */
  cron: string;
  /** 要执行的工作流ID */
  workflowId?: string;
  /** 要执行的插件ID */
  pluginId?: string;
  /** 要执行的agentID */
  agentId?: string;
  /** 是否已启用 */
  enabled?: boolean;
  /** 代理输入内容 */
  agentInput?: string;
  /** 插件参数 */
  pluginParams?: Record<string, any>;
  /** 工作流输入参数 */
  workflowInputs?: Record<string, any>;
}

/**
 * 调度系统 - 负责管理定时执行的工作流
 */
export class Scheduler {
  /** 存储所有计划，key为计划ID */
  private static store = new LocalEcho<Record<string, Schedule>>(
    {},
    "scheduler",
  );

  /** 存储运行中的定时任务，key为任务ID（可能是工作流ID、插件ID或代理ID） */
  private static tickies = new Echo<Record<string, Tickie>>({});

  /** 获取所有计划（响应式） */
  static use = Scheduler.store.use.bind(Scheduler.store);

  /** 设置计划 */
  static set = Scheduler.store.set.bind(Scheduler.store);

  /**
   * 获取指定计划的执行历史记录
   * @param scheduleId 计划ID
   * @returns 执行历史记录的Echo实例
   */
  private static getHistoryEcho(scheduleId: string) {
    return Echo.get<Record<string, ExecutionHistory>>({
      database: SCHEDULE_HISTORY_DATABASE,
      name: scheduleId,
    });
  }

  /**
   * 记录执行历史
   * @param scheduleId 计划ID
   * @param history 执行历史记录
   */
  private static async recordHistory(
    scheduleId: string,
    history: ExecutionHistory,
  ) {
    Echo.get<Record<string, ExecutionHistory>>({
      database: SCHEDULE_HISTORY_DATABASE,
      name: scheduleId,
    }).ready(
      (prev) => {
        return {
          ...prev,
          [history.timestamp]: history,
        };
      },
      { replace: true },
    );
  }

  /**
   * 清空指定计划的执行历史
   * @param scheduleId 计划ID
   */
  static clearHistory(scheduleId: string) {
    Scheduler.getHistoryEcho(scheduleId).ready({}, { replace: true });
  }

  /**
   * 取消定时任务并从存储中删除
   * @param scheduleId 计划ID
   */
  static cancel(scheduleId: string) {
    // 获取计划信息
    const schedule = Scheduler.store.current[scheduleId];
    if (!schedule) return;

    let taskId: string | undefined;

    // 根据计划类型获取任务ID
    switch (schedule.type) {
      case "workflow":
        taskId = schedule.workflowId;
        break;
      case "plugin":
        taskId = schedule.pluginId;
        break;
      case "agent":
        taskId = schedule.agentId;
        break;
    }

    // 如果有关联的任务且正在运行，停止它
    if (taskId) {
      const tickie = Scheduler.tickies.current[taskId];
      if (tickie) {
        console.log(`停止${schedule.type} ${taskId} 的定时任务`);
        tickie.stop();
        Scheduler.tickies.delete(taskId);
      }
    }
  }

  static delete(scheduleId: string) {
    // 删除计划
    Scheduler.store.delete(scheduleId);
    // 清空执行历史并删除历史记录存储
    Scheduler.getHistoryEcho(scheduleId).discard();
  }

  /**
   * 更新定时任务
   * @param scheduleId 计划ID
   * @param body 更新的内容
   */
  static update(scheduleId: string, body: Partial<Schedule>) {
    // 获取计划信息
    const schedule = {
      ...Scheduler.store.current[scheduleId],
      ...body,
      id: scheduleId,
    };

    // 更新计划
    Scheduler.store.set((prev) => ({
      ...prev,
      [scheduleId]: {
        ...prev[scheduleId],
        ...body,
        id: scheduleId,
      },
    }));

    // 如果计划是禁用状态，确保任务被取消
    if (body.enabled === false) {
      Scheduler.cancel(scheduleId);
      return;
    }

    // 检查计划是否有有效的任务ID
    const hasValidTaskId =
      (schedule.type === "workflow" && schedule.workflowId) ||
      (schedule.type === "plugin" && schedule.pluginId) ||
      (schedule.type === "agent" && schedule.agentId);

    // 如果计划被启用，启动任务
    if (body.enabled === true && hasValidTaskId && schedule.cron) {
      console.log(`计划被启用，启动任务: ${scheduleId}`);
      Scheduler.startTask(schedule);
      return;
    }

    // 如果计划已启用且cron表达式被更新，更新定时任务
    if (schedule.enabled && body.cron && hasValidTaskId) {
      let taskId: string | undefined;

      switch (schedule.type) {
        case "workflow":
          taskId = schedule.workflowId;
          break;
        case "plugin":
          taskId = schedule.pluginId;
          break;
        case "agent":
          taskId = schedule.agentId;
          break;
      }

      if (taskId) {
        const tickie = Scheduler.tickies.current[taskId];
        if (tickie) {
          tickie.stop();
          tickie.cron(schedule.cron);
          tickie.start();
        } else {
          Scheduler.startTask(schedule);
        }
      }
    }
  }

  /**
   * 启动指定计划对应的定时任务
   * @param schedule 计划对象
   */
  private static async startTask(schedule: Schedule) {
    if (!schedule.enabled) return;

    let taskId: string | undefined;

    // 根据计划类型获取任务ID
    switch (schedule.type) {
      case "workflow":
        taskId = schedule.workflowId;
        break;
      case "plugin":
        taskId = schedule.pluginId;
        break;
      case "agent":
        taskId = schedule.agentId;
        break;
    }

    if (!taskId) return;

    try {
      // 先检查是否有已存在的任务，如果有则停止
      const existingTask = Scheduler.tickies.current[taskId];
      if (existingTask) {
        existingTask.stop();
        Scheduler.tickies.delete(taskId);
      }

      const tickie = new Tickie({ [schedule.type]: taskId });

      tickie
        .cron(schedule.cron)
        .exe(async () => {
          try {
            // 准备执行历史记录
            let targetName = "";
            let result = null;

            // 根据不同类型执行不同的任务
            switch (schedule.type) {
              case "workflow":
                if (schedule.workflowId) {
                  const workflow = await Workflow.get(schedule.workflowId);
                  targetName = workflow.meta.name || "";
                  // 使用设置的输入参数执行工作流
                  result = await workflow.execute(
                    schedule.workflowInputs || {},
                  );
                }
                break;
              case "plugin":
                if (schedule.pluginId) {
                  const plugin = await Toolkit.get(schedule.pluginId);
                  targetName = plugin.props.name || "";
                  // 如果有指定参数，使用指定参数；否则使用空对象
                  const params = schedule.pluginParams || {};
                  // 假设插件的第一个工具是默认执行的工具
                  if (plugin.props.tools && plugin.props.tools.length > 0) {
                    const tool = plugin.props.tools[0];
                    result = await plugin.execute(tool.name, params);
                  }
                }
                break;
              case "agent":
                if (schedule.agentId) {
                  const agent = await AgentManager.getById(schedule.agentId);
                  targetName = agent.infos.name || "";
                  // 如果设置了输入内容，使用设置的内容；否则使用默认消息
                  const input = schedule.agentInput || "定时任务自动触发";
                  result = await agent.chat(input);
                }
                break;
            }

            // 记录执行历史
            Scheduler.recordHistory(schedule.id, {
              timestamp: Date.now(),
              success: true,
              type: schedule.type,
              targetId: taskId,
              targetName: targetName,
              result: result,
            });

            return { success: true, data: result };
          } catch (error) {
            console.error(`${schedule.type}执行失败: ${error}`);

            // 记录失败的执行历史
            Scheduler.recordHistory(schedule.id, {
              timestamp: Date.now(),
              success: false,
              error: String(error),
              type: schedule.type,
              targetId: taskId,
              targetName: "", // 失败时可能无法获取名称
            });

            return { success: false, error: String(error) };
          }
        })
        .start();

      // 保存定时任务实例
      Scheduler.tickies.set((prev) => ({
        ...prev,
        [taskId]: tickie,
      }));
    } catch (error) {
      console.error(`启动定时任务失败:`, error);
    }
  }

  /**
   * 初始化并启动所有计划
   */
  static init() {
    try {
      const enabledSchedules = Object.values(Scheduler.store.current).filter(
        (s) => {
          return (
            s.enabled === true &&
            ((s.type === "workflow" && s.workflowId) ||
              (s.type === "plugin" && s.pluginId) ||
              (s.type === "agent" && s.agentId))
          );
        },
      );

      // 启动所有启用的计划
      for (const schedule of enabledSchedules) {
        Scheduler.startTask(schedule);
      }

      if (enabledSchedules.length > 0) {
        toast.success(`已启动 ${enabledSchedules.length} 个定时任务`);
      }
    } catch (error) {
      console.error("调度器初始化失败:", error);
      toast.error("定时任务系统启动失败");
    }
  }

  /**
   * 检查计划是否已启用
   * @param scheduleId 计划ID
   */
  static isEnabled(scheduleId: string): boolean {
    // 获取计划信息
    const schedule = Scheduler.store.current[scheduleId];
    if (!schedule) return false;

    // 直接返回enabled字段的值
    return schedule.enabled === true;
  }
}
