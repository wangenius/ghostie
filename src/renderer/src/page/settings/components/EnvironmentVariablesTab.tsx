import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { Key, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { TbPencil, TbTrash } from "react-icons/tb";

interface EnvVar {
  key: string;
  value: string;
}

export default function EnvironmentVariablesTab() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVar, setEditingVar] = useState<EnvVar | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    loadEnvVars();
  }, []);

  const loadEnvVars = async () => {
    try {
      setLoading(true);
      const envVars = await cmd.invoke<EnvVar[]>("env_list");
      setVars(envVars);
    } catch (error) {
      cmd.message("加载环境变量失败", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setNewKey("");
    setNewValue("");
    setIsEditing(true);
    setEditingVar(null);
  };

  const handleEdit = (v: EnvVar) => {
    setEditingVar(v);
    setIsAdding(false);
    setIsEditing(true);
  };

  const handleCloseDrawer = () => {
    setIsEditing(false);
    setEditingVar(null);
    setIsAdding(false);
  };

  const handleSaveEdit = async () => {
    if (editingVar) {
      const newVars = [...vars];
      const index = newVars.findIndex((v) => v.key === editingVar.key);
      if (index !== -1) {
        newVars[index] = editingVar;
        setVars(newVars);
        try {
          await cmd.invoke("env_save", { vars: newVars });
          await cmd.message("变量已保存", "success");
        } catch {
          cmd.message("保存失败", "error");
        }
      }
    }
    setIsEditing(false);
  };

  const handleSaveNew = async () => {
    if (!newKey.trim()) {
      cmd.message("环境变量名不能为空", "error");
      return;
    }
    if (vars.some((v) => v.key === newKey.trim())) {
      cmd.message("环境变量名已存在", "error");
      return;
    }
    const newVar = { key: newKey.trim(), value: newValue };
    const newVars = [...vars, newVar];
    setVars(newVars);
    try {
      await cmd.invoke("env_save", { vars: newVars });
      await cmd.message("变量已保存", "success");
    } catch {
      cmd.message("保存失败", "error");
    }
    setIsAdding(false);
    setIsEditing(false);
  };

  const handleRemove = (key: string) => {
    setVars(vars.filter((v) => v.key !== key));
  };

  // 过滤变量列表
  const filteredVars = vars.filter((v) =>
    v.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full h-full border-none shadow-none flex flex-col">
      <div className="flex justify-between items-center mb-2 overflow-hidden">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索环境变量"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              size="icon"
              onClick={loadEnvVars}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={handleAdd} className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </div>
      <div>
        <ScrollArea className="flex-1 border rounded-2xl">
          {filteredVars.length > 0 ? (
            <div className="p-1">
              {filteredVars.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 group"
                >
                  <div className="flex-1 overflow-hidden flex items-center gap-2 select-none">
                    <Key className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{v.key}</span>
                    {(!v.value || v.value.trim() === "") && (
                      <span className="text-xs text-red-500 ml-2">未填写</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(v)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    >
                      <TbPencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(v.key)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    >
                      <TbTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Badge variant="outline" className="mb-2">
                没有匹配的变量
              </Badge>
              <p className="text-xs text-muted-foreground">
                尝试使用不同的搜索词
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Badge variant="outline" className="mb-2">
                没有环境变量
              </Badge>
              <p className="text-xs text-muted-foreground">
                点击"添加"按钮创建第一个环境变量
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 编辑抽屉 */}
      <Drawer
        direction="right"
        open={isEditing}
        onOpenChange={handleCloseDrawer}
        title={isAdding ? "添加环境变量" : "编辑环境变量"}
        className="w-[400px]"
      >
        {isAdding ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-key" className="text-sm font-medium">
                变量名
              </Label>
              <Input
                id="new-key"
                placeholder="VARIABLE_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-value" className="text-sm font-medium">
                变量值
              </Label>
              <Textarea
                id="new-value"
                placeholder="变量值"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="min-h-[200px] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCloseDrawer}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveNew}>
                保存
              </Button>
            </div>
          </div>
        ) : editingVar ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-muted-foreground/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Key className="h-3.5 w-3.5" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold truncate">{editingVar.key}</p>
                  <p className="text-xs mt-1">
                    使用方式:
                    <code className="bg-muted rounded px-1 py-0.5">
                      process.env.{editingVar.key}
                    </code>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value" className="text-sm font-medium">
                变量值
              </Label>
              <Textarea
                id="value"
                placeholder="变量值"
                value={editingVar.value}
                onChange={(e) =>
                  setEditingVar({ ...editingVar, value: e.target.value })
                }
                className="min-h-[200px] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCloseDrawer}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
