import { TABLE_DATA_DATABASE, TABLE_DATA_INDEX } from "@/assets/const";
import { Echoi } from "@/lib/echo/Echo";
import { gen } from "@/utils/generator";

export interface ColumnDefinition {
  name: string;
  description: string;
}

export interface DataTable {
  id: string;
  name: string;
  description: string;
  columns: ColumnDefinition[]; // 列定义，包含名称和描述
  createdAt: number;
  updatedAt: number;
}

// 表定义存储
export const TableStore = new Echoi<Record<string, DataTable>>({}).indexed({
  database: TABLE_DATA_INDEX,
  name: "index",
});

export const CurrentDataStore = new Echoi<
  Record<string, Record<string, string>>
>({}).indexed({
  database: TABLE_DATA_DATABASE,
  name: "",
});

/**
 * 简单的数据表管理类
 */
export class DataTableManager {
  /**
   * 创建新表
   */
  static createTable(
    name: string,
    description: string = "",
    columns: ColumnDefinition[],
  ): string {
    if (!name || !columns.length) {
      throw new Error("表名和至少一列是必须的");
    }

    // 检查表名是否已存在
    const existingTable = Object.values(TableStore.current).find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (existingTable) {
      throw new Error(`表名 "${name}" 已存在`);
    }

    // 创建表ID
    const id = gen.id();
    const now = Date.now();

    // 创建表定义
    const table: DataTable = {
      id,
      name,
      description,
      columns,
      createdAt: now,
      updatedAt: now,
    };

    TableStore.set({
      [id]: table,
    });

    CurrentDataStore.set({});
    return id;
  }

  /**
   * 更新表信息
   */
  static updateTable(
    id: string,
    updates: Partial<Omit<DataTable, "id" | "createdAt">>,
  ): boolean {
    const tables = TableStore.current;
    const table = tables[id];

    if (!table) {
      return false;
    }

    // 更新表定义
    const updatedTable = {
      ...table,
      ...updates,
      updatedAt: Date.now(),
    };

    TableStore.set({
      [id]: updatedTable,
    });

    return true;
  }

  /**
   * 添加列
   */
  static addColumn(
    tableId: string,
    columnName: string,
    columnDescription: string = "",
  ): boolean {
    const tables = TableStore.current;
    const table = tables[tableId];

    if (!table) {
      return false;
    }

    // 检查列名是否已存在
    if (table.columns.some((col) => col.name === columnName)) {
      throw new Error(`列名 "${columnName}" 已存在`);
    }

    // 更新表定义
    const updatedTable = {
      ...table,
      columns: [
        ...table.columns,
        { name: columnName, description: columnDescription },
      ],
      updatedAt: Date.now(),
    };

    TableStore.set({
      [tableId]: updatedTable,
    });

    return true;
  }

  /**
   * 删除表
   */
  static deleteTable(id: string): boolean {
    TableStore.delete(id);
    CurrentDataStore.discard();
    CurrentDataStore.temporary();
    return true;
  }

  /**
   * 获取表数据
   */
  static async getTableData(tableId: string) {
    const tableData = await CurrentDataStore.getCurrent();
    return tableData[tableId];
  }

  /**
   * 删除列
   */
  static deleteColumn(tableId: string, columnName: string): boolean {
    const tables = TableStore.current;
    const table = tables[tableId];

    if (!table) {
      return false;
    }

    // 检查列是否存在
    if (!table.columns.some((col) => col.name === columnName)) {
      throw new Error(`列 "${columnName}" 不存在`);
    }

    // 更新表定义，移除指定列
    const updatedTable = {
      ...table,
      columns: table.columns.filter((col) => col.name !== columnName),
      updatedAt: Date.now(),
    };

    // 确保表至少保留一列
    if (updatedTable.columns.length === 0) {
      throw new Error("表必须至少有一列，无法删除最后一列");
    }

    TableStore.set({
      [tableId]: updatedTable,
    });

    return true;
  }

  /**
   * 更新列名
   */
  static updateColumnName(
    tableId: string,
    oldName: string,
    newName: string,
  ): boolean {
    const tables = TableStore.current;
    const table = tables[tableId];

    if (!table) {
      return false;
    }

    // 检查旧列名是否存在
    if (!table.columns.some((col) => col.name === oldName)) {
      throw new Error(`列 "${oldName}" 不存在`);
    }

    // 检查新列名是否已存在（除非新旧名称相同）
    if (
      oldName !== newName &&
      table.columns.some((col) => col.name === newName)
    ) {
      throw new Error(`列名 "${newName}" 已存在`);
    }

    // 更新表定义
    const updatedTable = {
      ...table,
      columns: table.columns.map((col) =>
        col.name === oldName ? { ...col, name: newName } : col,
      ),
      updatedAt: Date.now(),
    };

    TableStore.set({
      [tableId]: updatedTable,
    });

    return true;
  }
}
