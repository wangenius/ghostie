import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ColumnDefinition,
  CurrentDataStore,
  DataTableManager,
  TableStore,
} from "@/database/Database";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import {
  TbDatabase,
  TbDots,
  TbPlus,
  TbSearch,
  TbSettings,
  TbTrash,
  TbX,
} from "react-icons/tb";
import { toast } from "sonner";
import { TableViewer } from "./TableViewer";

// 表设置与字段管理组合抽屉组件
interface TableSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string | null;
  tableName: string;
  tableDescription: string;
  columns: ColumnDefinition[];
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onColumnsChange: (columns: ColumnDefinition[]) => void;
  onSave: () => void;
}

function TableSettingsDrawer({
  open,
  onOpenChange,
  tableId,
  tableName,
  tableDescription,
  columns,
  onNameChange,
  onDescriptionChange,
  onColumnsChange,
  onSave,
}: TableSettingsDrawerProps) {
  const [newColumnName, setNewColumnName] = useState<string>("");
  const [newColumnDescription, setNewColumnDescription] = useState<string>("");

  // 添加列
  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast.error("列名不能为空");
      return;
    }

    if (columns.some((col: ColumnDefinition) => col.name === newColumnName)) {
      toast.error("列名已存在");
      return;
    }

    onColumnsChange([
      ...columns,
      { name: newColumnName, description: newColumnDescription },
    ]);
    setNewColumnName("");
    setNewColumnDescription("");

    if (tableId) {
      toast.success(`已添加列 "${newColumnName}"`);
    }
  };

  // 移除列
  const handleRemoveColumn = (columnName: string) => {
    onColumnsChange(
      columns.filter((col: ColumnDefinition) => col.name !== columnName),
    );

    if (tableId) {
      toast.success(`已删除列 "${columnName}"`);
    }
  };

  // 更新列描述
  const handleUpdateColumnDescription = (
    columnName: string,
    description: string,
  ) => {
    onColumnsChange(
      columns.map((col: ColumnDefinition) =>
        col.name === columnName ? { ...col, description } : col,
      ),
    );
  };

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={onOpenChange}
      className="w-[500px]"
      title={
        <div className="p-2 w-full">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">表设置</h3>
            <Button onClick={onSave} size="sm">
              保存设置
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            管理表 "{tableName}" 的设置和字段
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 表基本信息 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">基本信息</h4>
          <div>
            <label className="text-sm font-medium mb-1.5 block">表名称</label>
            <Input
              value={tableName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="输入表名称"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">表描述</label>
            <Textarea
              value={tableDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="输入表描述（可选）"
              rows={3}
            />
          </div>
        </div>

        {/* 字段管理 */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">字段管理</h4>
            <Badge variant="outline" className="ml-auto">
              {columns.length} 个字段
            </Badge>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">字段名</TableHead>
                  <TableHead>字段描述</TableHead>
                  <TableHead className="w-[80px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column, index) => (
                  <TableRow key={index}>
                    <TableCell>{column.name}</TableCell>
                    <TableCell>
                      <Input
                        value={column.description}
                        onChange={(e) =>
                          handleUpdateColumnDescription(
                            column.name,
                            e.target.value,
                          )
                        }
                        placeholder="字段描述（可选）"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveColumn(column.name)}
                      >
                        <TbTrash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="新字段名"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddColumn();
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newColumnDescription}
                      onChange={(e) => setNewColumnDescription(e.target.value)}
                      placeholder="字段描述（可选）"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddColumn();
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={handleAddColumn}>
                      <TbPlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {columns.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      暂无字段，请添加字段
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export function DatabaseTab() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [newTableView, setNewTableView] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>("");
  const [newTableDescription, setNewTableDescription] = useState<string>("");
  const [newColumnName, setNewColumnName] = useState<string>("");
  const [newColumnDescription, setNewColumnDescription] = useState<string>("");
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddRecordDrawer, setShowAddRecordDrawer] =
    useState<boolean>(false);
  const tables = TableStore.use();

  // 选择表时加载数据
  useEffect(() => {
    if (selectedTable) {
      const table = tables[selectedTable];
      if (table) {
        setNewTableName(table.name);
        setNewTableDescription(table.description);
        setColumns([...table.columns]);
        setNewTableView(false);

        // 加载表数据
        CurrentDataStore.indexed({
          database: "TABLE_DATA",
          name: selectedTable,
        });
      }
    }
  }, [selectedTable, tables]);

  // 更新表信息
  const updateTableInfo = async () => {
    if (!selectedTable) return;

    try {
      const success = DataTableManager.updateTable(selectedTable, {
        name: newTableName,
        description: newTableDescription,
        columns: columns,
      });

      if (success) {
        toast.success("表信息已更新");
        setSettingsDrawerOpen(false);
      } else {
        toast.error("更新表信息失败");
      }
    } catch (error) {
      toast.error("更新表信息失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 创建新表
  const createTable = async () => {
    if (!newTableName.trim()) {
      toast.error("表名不能为空");
      return;
    }

    if (columns.length === 0) {
      toast.error("表必须至少有一列");
      return;
    }

    try {
      const newTableId = DataTableManager.createTable(
        newTableName,
        newTableDescription,
        columns,
      );

      toast.success("表创建成功");

      // 重置表单
      setNewTableView(false);
      setSelectedTable(newTableId);

      // 延迟重置状态，避免切换过程中出现UI闪烁
      setTimeout(() => {
        setNewTableName("");
        setNewTableDescription("");
        setColumns([]);
      }, 100);
    } catch (error) {
      toast.error("创建表失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 删除表
  const deleteTable = async () => {
    if (!selectedTable) return;

    try {
      const success = DataTableManager.deleteTable(selectedTable);

      if (success) {
        toast.success("表已删除");
        setSelectedTable(null);
      } else {
        toast.error("删除表失败");
      }
    } catch (error) {
      toast.error("删除表失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 添加列
  const addColumn = () => {
    if (!newColumnName.trim()) {
      toast.error("列名不能为空");
      return;
    }

    if (columns.some((col) => col.name === newColumnName)) {
      toast.error("列名已存在");
      return;
    }

    if (selectedTable) {
      try {
        // 使用DataTableManager添加列
        const success = DataTableManager.addColumn(
          selectedTable,
          newColumnName,
          newColumnDescription,
        );

        if (success) {
          // 更新本地状态
          setColumns((prev) => [
            ...prev,
            { name: newColumnName, description: newColumnDescription },
          ]);
          setNewColumnName("");
          setNewColumnDescription("");
          toast.success(`已添加列 "${newColumnName}"`);
        }
      } catch (error) {
        toast.error("添加列失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
    } else {
      // 在创建表时仅更新本地状态
      setColumns((prev) => [
        ...prev,
        { name: newColumnName, description: newColumnDescription },
      ]);
      setNewColumnName("");
      setNewColumnDescription("");
    }
  };

  // 移除列
  const removeColumn = (columnName: string) => {
    if (selectedTable) {
      try {
        // 使用DataTableManager删除列
        const success = DataTableManager.deleteColumn(
          selectedTable,
          columnName,
        );

        if (success) {
          // 更新本地状态
          setColumns((prev) => prev.filter((col) => col.name !== columnName));
          toast.success(`已删除列 "${columnName}"`);
        } else {
          toast.error("删除列失败");
        }
      } catch (error) {
        toast.error("删除列失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
    } else {
      // 创建表时可自由移除列
      setColumns((prev) => prev.filter((col) => col.name !== columnName));
    }
  };

  // 更新列描述
  const updateColumnDescription = (columnName: string, description: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.name === columnName ? { ...col, description } : col,
      ),
    );
  };

  // 创建新表视图
  const renderNewTableView = () => (
    <div className="w-full space-y-6 p-4 bg-background border-0">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">创建新表</h2>
        <p className="text-sm text-muted-foreground">
          填写表的基本信息并添加字段
        </p>
      </div>

      <div className="space-y-6">
        {/* 表基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">表名称</label>
            <Input
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="输入表名称"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">表描述</label>
            <Textarea
              value={newTableDescription}
              onChange={(e) => setNewTableDescription(e.target.value)}
              placeholder="输入表描述（可选）"
              rows={3}
            />
          </div>
        </div>

        {/* 字段设置 */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">表字段</h4>
            <Badge variant="outline" className="ml-auto">
              {columns.length} 个字段
            </Badge>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">字段名</TableHead>
                  <TableHead>字段描述</TableHead>
                  <TableHead className="w-[80px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column, index) => (
                  <TableRow key={index}>
                    <TableCell>{column.name}</TableCell>
                    <TableCell>
                      <Input
                        value={column.description}
                        onChange={(e) =>
                          updateColumnDescription(column.name, e.target.value)
                        }
                        placeholder="字段描述（可选）"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColumn(column.name)}
                      >
                        <TbTrash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="新字段名"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addColumn();
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newColumnDescription}
                      onChange={(e) => setNewColumnDescription(e.target.value)}
                      placeholder="字段描述（可选）"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addColumn();
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={addColumn}>
                      <TbPlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {columns.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      至少添加一个字段
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setNewTableView(false);
              if (selectedTable) {
                const table = tables[selectedTable];
                if (table) {
                  setNewTableName(table.name);
                  setNewTableDescription(table.description);
                  setColumns([...table.columns]);
                }
              } else {
                setNewTableName("");
                setNewTableDescription("");
                setColumns([]);
              }
            }}
          >
            取消
          </Button>
          <Button
            onClick={createTable}
            disabled={!newTableName.trim() || columns.length === 0}
          >
            创建表
          </Button>
        </div>
      </div>
    </div>
  );

  // 已有表视图
  const renderSelectedTableView = () => {
    if (!selectedTable) return null;

    const table = tables[selectedTable];
    if (!table) return null;

    return (
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* 顶部工具栏 */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2 items-center">
            <h3 className="text-2xl font-medium">{table.name}</h3>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="pl-8 w-[180px] h-8"
              />
              <TbSearch className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-5 w-5 rounded-full"
                  onClick={() => {
                    setSearchQuery("");
                  }}
                >
                  <TbX className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Button
              onClick={() => setShowAddRecordDrawer(true)}
              size="sm"
              className="h-8"
            >
              <TbPlus className="mr-1 h-4 w-4" />
              添加
            </Button>

            <Button size="icon" onClick={() => setSettingsDrawerOpen(true)}>
              <TbSettings className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon">
                  <TbDots className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(table.id);
                    toast.success("表ID已复制到剪贴板");
                  }}
                  className="text-xs font-normal"
                >
                  {table.id}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    const result = await cmd.confirm(`
                      您确定要删除表 ${table.name}
                      吗？此操作不可恢复，所有数据将被永久删除。
                    `);
                    if (result) {
                      deleteTable();
                    }
                  }}
                >
                  <TbTrash className="h-4 w-4" />
                  <span>删除表</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 表数据视图 */}
        <div className="flex-1 h-full">
          <TableViewer
            tableId={selectedTable}
            searchQuery={searchQuery}
            showAddRecordDrawer={showAddRecordDrawer}
            onShowAddRecordDrawerChange={setShowAddRecordDrawer}
          />
        </div>

        {/* 表设置与字段管理抽屉 */}
        <TableSettingsDrawer
          open={settingsDrawerOpen}
          onOpenChange={setSettingsDrawerOpen}
          tableId={selectedTable}
          tableName={newTableName}
          tableDescription={newTableDescription}
          columns={columns}
          onNameChange={setNewTableName}
          onDescriptionChange={setNewTableDescription}
          onColumnsChange={setColumns}
          onSave={updateTableInfo}
        />
      </div>
    );
  };

  // 无表选择时的空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
      <TbDatabase className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">暂无数据表</h3>
      <p className="text-muted-foreground mb-6">
        请从左侧选择一个表或创建新表以管理数据
      </p>
      <Button onClick={() => setNewTableView(true)} className="h-9 px-4">
        <TbPlus className="mr-2 h-4 w-4" />
        创建新表
      </Button>
    </div>
  );

  return (
    <PreferenceLayout>
      {/* 侧边栏 - 表列表 */}
      <PreferenceList
        items={Object.values(tables).map((table) => ({
          id: table.id,
          name: table.name,
          content: (
            <div className="flex flex-col">
              <span className="text-sm font-bold">{table.name}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {table.description}
              </span>
            </div>
          ),
          actived: table.id === selectedTable,
          onClick() {
            setSelectedTable(table.id);
            setNewTableView(false);
          },
          noRemove: true,
        }))}
        left={<div className="py-2 px-3 text-xs font-medium">数据表列表</div>}
        right={
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setNewTableView(true);
              setNewTableName("");
              setNewTableDescription("");
              setColumns([]);
              setSelectedTable(null);
            }}
          >
            <TbPlus className="mr-2 h-4 w-4" />
            创建新表
          </Button>
        }
      />

      {/* 主内容区 */}
      <PreferenceBody className="bg-background">
        {newTableView
          ? renderNewTableView()
          : selectedTable
            ? renderSelectedTableView()
            : renderEmptyState()}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
