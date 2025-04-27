import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrentDataStore, TableStore } from "@/database/Database";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbEdit, TbTrash } from "react-icons/tb";
import { toast } from "sonner";

interface TableViewerProps {
  tableId: string;
  searchQuery?: string;
  pageSize?: number;
  showAddRecordDialog?: boolean;
  onShowAddRecordDialogChange?: (open: boolean) => void;
}

export function TableViewer({
  tableId,
  searchQuery: initialSearchQuery = "",
  pageSize: initialPageSize = 10,
  showAddRecordDialog,
  onShowAddRecordDialogChange,
}: TableViewerProps) {
  const records = CurrentDataStore.use();
  const tables = TableStore.use();
  const table = tables[tableId];

  // 状态管理
  const [recordDialog, setRecordDialog] = useState<{
    open: boolean;
    isEditing: boolean;
    currentRecord: Record<string, string>;
    recordId?: string;
  }>({
    open: false,
    isEditing: false,
    currentRecord: {},
  });
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  // 监听外部搜索查询变化
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    // 搜索变化时重置到第一页
    setCurrentPage(1);
  }, [initialSearchQuery]);

  // 监听外部页大小变化
  useEffect(() => {
    setPageSize(initialPageSize);
    // 页大小变化时重置到第一页
    setCurrentPage(1);
  }, [initialPageSize]);

  // 监听外部添加记录对话框显示状态变化
  useEffect(() => {
    if (showAddRecordDialog) {
      openAddDialog();
      // 重置父组件的状态
      if (onShowAddRecordDialogChange) {
        onShowAddRecordDialogChange(false);
      }
    }
  }, [showAddRecordDialog]);

  // 更新记录对话框状态
  useEffect(() => {
    if (!recordDialog.open && onShowAddRecordDialogChange) {
      onShowAddRecordDialogChange(false);
    }
  }, [recordDialog.open, onShowAddRecordDialogChange]);

  // 加载表数据和结构
  useEffect(() => {
    CurrentDataStore.indexed({
      database: "TABLE_DATA",
      name: tableId,
    });
  }, [tableId]);

  // 打开添加记录对话框
  const openAddDialog = () => {
    const initialRecord: Record<string, string> = {};
    if (table && table.columns) {
      table.columns.forEach((column) => {
        initialRecord[column.name] = "";
      });
    }

    setRecordDialog({
      open: true,
      isEditing: false,
      currentRecord: initialRecord,
    });
  };

  // 打开编辑记录对话框
  const openEditDialog = (recordId: string, record: Record<string, string>) => {
    setRecordDialog({
      open: true,
      isEditing: true,
      currentRecord: { ...record },
      recordId,
    });
  };

  // 打开删除确认对话框
  const openDeleteDialog = async (recordId: string) => {
    const res = await cmd.confirm(`确定删除该记录${recordId}吗？`);
    if (res) {
      deleteRecord(recordId);
      toast.success("记录已删除");
    } else {
      toast.error("删除失败");
    }
  };

  // 添加或更新记录
  const saveRecord = async () => {
    try {
      if (recordDialog.isEditing && recordDialog.recordId) {
        // 更新现有记录
        CurrentDataStore.set({
          [recordDialog.recordId]: recordDialog.currentRecord,
        });
        toast.success("记录更新成功");
      } else {
        // 添加新记录
        const recordId = `record_${Date.now()}`;
        CurrentDataStore.set({
          [recordId]: recordDialog.currentRecord,
        });
        toast.success("记录添加成功");
      }

      // 关闭对话框
      setRecordDialog({
        open: false,
        isEditing: false,
        currentRecord: {},
      });
    } catch (error) {
      toast.error(recordDialog.isEditing ? "更新记录失败" : "添加记录失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 删除记录
  const deleteRecord = async (recordId: string) => {
    try {
      if (recordId) {
        CurrentDataStore.delete(recordId);
        toast.success("记录已删除");
      }
    } catch (error) {
      toast.error("删除记录失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 更新记录字段
  const updateField = (field: string, value: string) => {
    setRecordDialog((prev) => ({
      ...prev,
      currentRecord: {
        ...prev.currentRecord,
        [field]: value,
      },
    }));
  };

  // 处理排序
  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  // 过滤和排序记录
  const getProcessedRecords = () => {
    if (!records) return [];

    let recordsArray = Object.entries(records);

    // 搜索过滤
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      recordsArray = recordsArray.filter(([_, record]) =>
        Object.values(record).some((value) =>
          String(value).toLowerCase().includes(lowerCaseQuery),
        ),
      );
    }

    // 排序
    if (sortConfig.key) {
      recordsArray.sort(([_, recordA], [__, recordB]) => {
        const valueA = String(recordA[sortConfig.key as string] || "");
        const valueB = String(recordB[sortConfig.key as string] || "");

        if (sortConfig.direction === "ascending") {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      });
    }

    return recordsArray;
  };

  // 获取分页记录
  const getPaginatedRecords = () => {
    const processedRecords = getProcessedRecords();
    const startIndex = (currentPage - 1) * pageSize;
    return processedRecords.slice(startIndex, startIndex + pageSize);
  };

  if (!table) {
    return (
      <div className="w-full flex items-center justify-center min-h-[200px]">
        <div className="text-center text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const paginatedRecords = getPaginatedRecords();

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="border flex-1 rounded-md overflow-hidden bg-background">
        <ScrollArea className="h-[450px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                {table.columns.map((column) => (
                  <TableHead
                    key={column.name}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleSort(column.name)}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            {column.name}
                            {sortConfig.key === column.name && (
                              <Badge variant="outline" className="ml-2">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        {column.description && (
                          <TooltipContent>
                            <p>{column.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                ))}
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map(([recordId, record], index) => {
                  const actualIndex = (currentPage - 1) * pageSize + index;
                  return (
                    <TableRow key={recordId}>
                      <TableCell className="font-medium">
                        {actualIndex + 1}
                      </TableCell>
                      {table.columns.map((column) => (
                        <TableCell key={column.name}>
                          {record[column.name] || ""}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(recordId, record)}
                          >
                            <TbEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(recordId)}
                          >
                            <TbTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.columns.length + 2}
                    className="h-24 text-center"
                  >
                    {searchQuery ? (
                      <div className="text-muted-foreground">
                        没有找到匹配的记录
                        <Button
                          variant="link"
                          onClick={() => setSearchQuery("")}
                          className="px-2 h-auto"
                        >
                          清除搜索
                        </Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        暂无数据，点击"添加记录"按钮添加
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* 新增/编辑记录对话框 */}
      <Dialog
        open={recordDialog.open}
        onOpenChange={(isOpen: boolean) =>
          setRecordDialog((prev) => ({ ...prev, open: isOpen }))
        }
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {recordDialog.isEditing ? "编辑记录" : "添加新记录"}
            </DialogTitle>
            <DialogDescription>
              {recordDialog.isEditing
                ? "更新记录信息，完成后点击保存"
                : "填写新记录的所有字段，然后添加到表中"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {table.columns.map((column) => (
              <div
                key={column.name}
                className="grid grid-cols-4 items-center gap-4"
              >
                <Label htmlFor={column.name} className="text-right">
                  {column.name}
                </Label>
                <div className="col-span-3">
                  <Input
                    id={column.name}
                    value={recordDialog.currentRecord[column.name] || ""}
                    onChange={(e) => updateField(column.name, e.target.value)}
                    placeholder={column.description || ""}
                  />
                  {column.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {column.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRecordDialog({
                  open: false,
                  isEditing: false,
                  currentRecord: {},
                })
              }
            >
              取消
            </Button>
            <Button onClick={saveRecord}>
              {recordDialog.isEditing ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
