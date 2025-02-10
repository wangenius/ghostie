// import { gen } from "@/utils/generator";
// import { tool } from "@/services/tool/Tool";
// import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
// import { join } from "path";

// /** 计划存储目录 */
// const planDir = "./plans";
// /** 计划索引文件路径 */
// const indexPath = join(planDir, "index.json");

// /** 计划优先级枚举 */
// export enum Priority {
//   Low = "低",
//   Medium = "中",
//   High = "高",
//   Urgent = "紧急",
// }

// /** 计划状态枚举 */
// export enum Status {
//   NotStarted = "未开始",
//   InProgress = "进行中",
//   Completed = "已完成",
//   Cancelled = "已取消",
// }

// interface PlanMetadata {
//   id: string;
//   title: string;
//   createdAt: string;
//   updatedAt: string;
//   priority: Priority;
//   status: Status;
//   dueDate?: string;
//   tags?: string[];
//   description?: string;
// }

// interface PlanContent extends PlanMetadata {}

// /** 计划工具类 */
// export class Plan {
//   constructor() {
//     // 确保计划目录存在
//     if (!existsSync(planDir)) {
//       mkdirSync(planDir, { recursive: true });
//     }
//     // 确保索引文件存在
//     if (!existsSync(indexPath)) {
//       writeFileSync(indexPath, JSON.stringify([], null, 2));
//     }
//   }

//   private static readIndex(): PlanMetadata[] {
//     return JSON.parse(readFileSync(indexPath, "utf8"));
//   }

//   private static writeIndex(metadata: PlanMetadata[]): void {
//     writeFileSync(indexPath, JSON.stringify(metadata, null, 2));
//   }

//   @tool("添加新计划", {
//     title: {
//       type: "string",
//       description: "计划标题",
//       required: true,
//     },
//     priority: {
//       type: "string",
//       description: "优先级（低/中/高/紧急）",
//       required: true,
//     },
//     dueDate: {
//       type: "string",
//       description: "截止日期（ISO格式）",
//       required: false,
//     },
//     description: {
//       type: "string",
//       description: "计划描述",
//       required: false,
//     },
//     tags: {
//       type: "array",
//       items: { type: "string" },
//       description: "计划标签",
//       required: false,
//     },
//   })
//   add(args: {
//     title: string;
//     priority: string;
//     dueDate?: string;
//     description?: string;
//     tags?: string[];
//   }): PlanMetadata {
//     const id = gen.id();
//     const now = new Date().toISOString();

//     const metadata: PlanMetadata = {
//       id,
//       title: args.title,
//       priority: args.priority as Priority,
//       status: Status.NotStarted,
//       description: args.description,
//       dueDate: args.dueDate,
//       tags: args.tags || [],
//       createdAt: now,
//       updatedAt: now,
//     };

//     // 更新索引
//     const index = Plan.readIndex();
//     index.push(metadata);
//     Plan.writeIndex(index);

//     return metadata;
//   }

//   @tool("删除计划", {
//     id: {
//       type: "string",
//       description: "计划ID",
//       required: true,
//     },
//   })
//   delete(args: { id: string }): { success: boolean } {
//     // 更新索引
//     const index = Plan.readIndex().filter((plan) => plan.id !== args.id);
//     Plan.writeIndex(index);

//     return { success: true };
//   }

//   @tool("更新计划内容", {
//     id: {
//       type: "string",
//       description: "计划ID",
//       required: true,
//     },
//     content: {
//       type: "string",
//       description: "新的计划内容",
//       required: true,
//     },
//   })
//   content(args: { id: string; content: string }): PlanMetadata {
//     // 更新索引
//     const index = Plan.readIndex();
//     const planIndex = index.findIndex((plan) => plan.id === args.id);

//     if (planIndex === -1) {
//       throw new Error("计划索引不存在");
//     }

//     const now = new Date().toISOString();
//     index[planIndex].updatedAt = now;
//     Plan.writeIndex(index);

//     return index[planIndex];
//   }

//   @tool("更新计划状态", {
//     id: {
//       type: "string",
//       description: "计划ID",
//       required: true,
//     },
//     status: {
//       type: "string",
//       description: "新状态（未开始/进行中/已完成/已取消）",
//       required: true,
//     },
//   })
//   updateStatus(args: { id: string; status: string }): PlanMetadata {
//     const index = Plan.readIndex();
//     const planIndex = index.findIndex((plan) => plan.id === args.id);

//     if (planIndex === -1) {
//       throw new Error("计划不存在");
//     }

//     const now = new Date().toISOString();
//     index[planIndex].status = args.status as Status;
//     index[planIndex].updatedAt = now;
//     Plan.writeIndex(index);

//     return index[planIndex];
//   }

//   @tool("读取计划", {
//     id: {
//       type: "string",
//       description: "计划ID",
//       required: true,
//     },
//   })
//   read(args: { id: string }): PlanContent {
//     // 读取元数据
//     const metadata = Plan.readIndex().find((plan) => plan.id === args.id);
//     if (!metadata) {
//       throw new Error("计划元数据不存在");
//     }

//     return {
//       ...metadata,
//     };
//   }

//   @tool("列出所有计划", {
//     status: {
//       type: "string",
//       description: "按状态筛选（可选）",
//       required: false,
//     },
//     priority: {
//       type: "string",
//       description: "按优先级筛选（可选）",
//       required: false,
//     },
//     tag: {
//       type: "string",
//       description: "按标签筛选（可选）",
//       required: false,
//     },
//   })
//   list(args?: {
//     status?: string;
//     priority?: string;
//     tag?: string;
//   }): PlanMetadata[] {
//     let plans = Plan.readIndex();

//     if (args?.status) {
//       plans = plans.filter((plan) => plan.status === args.status);
//     }

//     if (args?.priority) {
//       plans = plans.filter((plan) => plan.priority === args.priority);
//     }

//     if (args?.tag) {
//       plans = plans.filter((plan) => plan.tags?.includes(args.tag!));
//     }

//     return plans;
//   }
// }
