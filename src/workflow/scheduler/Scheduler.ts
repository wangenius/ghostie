import { Echo } from "echo-state";
import { Workflow } from "../execute/Workflow";
import { Tickie } from "tickie";

/* 任务调度器 */
export class Scheduler {
  /* 记录哪些工作流需要定时执行, key为工作流ID, value为cron表达式 */
  private static store = new Echo<Record<string, string>>({}).localStorage({
    name: "scheduler",
  });

  private static tickies = new Echo<Record<string, Tickie>>({});

  static use = Scheduler.store.use.bind(Scheduler.store);
  static current = Scheduler.store.current;
  static set = Scheduler.store.set.bind(Scheduler.store);

  static cancel(id: string) {
    const tickie = Scheduler.tickies.current[id];
    if (tickie) {
      tickie.stop();
    }
    Scheduler.tickies.delete(id);
    Scheduler.store.delete(id);
  }

  static update(id: string, cron: string) {
    const tickie = Scheduler.tickies.current[id];
    if (tickie) {
      tickie.stop();
      tickie.cron(cron);
      tickie.start();
    }
  }

  static init() {
    Object.entries(Scheduler.current).forEach(async ([id, cron]) => {
      console.log(id, cron);
      Scheduler.add(id, cron);
    });
  }

  /* 添加定时任务 */
  static async add(id: string, cron: string) {
    console.log(id, cron);
    Scheduler.store.set((prev) => ({
      ...prev,
      [id]: cron,
    }));
    const workflow = await Workflow.get(id);
    if (workflow) {
      const tickie = new Tickie({ workflow: id });
      tickie
        .cron(cron)
        .exe(async () => {
          await workflow.execute();
          return {
            success: true,
            data: {},
          };
        })
        .start();
      Scheduler.tickies.set({
        ...Scheduler.tickies.current,
        [id]: tickie,
      });
    }
  }
}
