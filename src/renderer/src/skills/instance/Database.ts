import { TableStore } from "@/database/Database";
import { SkillManager } from "../SkillManager";

/** 获取所有表 */
SkillManager.register("getAllTables", {
  name: "获取所有数据表",
  description: "获取所有可用的数据表，返回表列表",
  params: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    const tables = await TableStore.getCurrent();
    return Object.values(tables).map((table) => ({
      id: table.id,
      name: table.name,
      description: table.description,
      columnCount: table.columns.length,
      columns: table.columns,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    }));
  },
});
