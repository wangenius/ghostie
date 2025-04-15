import { dialog } from "@/components/custom/DialogModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { Key, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface EnvVar {
  key: string;
  value: string;
}

export function EnvEditor() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadEnvVars();
  }, []);

  useEffect(() => {
    // 当变量列表初次加载或发生变化时，默认选中第一个
    if (vars.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    } else if (vars.length === 0) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex >= vars.length) {
      setSelectedIndex(vars.length - 1);
    }
  }, [vars, selectedIndex]);

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
  };

  const handleSaveNew = () => {
    if (!newKey.trim()) {
      cmd.message("环境变量名不能为空", "error");
      return;
    }

    // 检查是否已存在相同的key
    if (vars.some((v) => v.key === newKey.trim())) {
      cmd.message("环境变量名已存在", "error");
      return;
    }

    const newVar = { key: newKey.trim(), value: newValue };
    const newVars = [...vars, newVar];
    setVars(newVars);
    setIsAdding(false);
    setSelectedIndex(newVars.length - 1);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleRemove = (index: number) => {
    setVars(vars.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      setSelectedIndex(index < vars.length - 1 ? index : index - 1);
    } else if (selectedIndex !== null && index < selectedIndex) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleValueChange = (value: string) => {
    if (selectedIndex !== null) {
      const newVars = [...vars];
      newVars[selectedIndex].value = value;
      setVars(newVars);
    }
  };

  const handleSave = async () => {
    try {
      // 验证是否有空的key
      if (vars.some((v) => !v.key.trim())) {
        cmd.message("环境变量名不能为空", "error");
        return;
      }

      setSaving(true);
      await cmd.invoke("env_save", { vars });
      await cmd.message("环境变量保存成功", "success");
      cmd.close();
    } catch (error) {
      cmd.message("保存环境变量失败", "error");
    } finally {
      setSaving(false);
    }
  };

  // 过滤变量列表
  const filteredVars = vars.filter((v) =>
    v.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 获取当前选中的变量
  const selectedVar = selectedIndex !== null ? vars[selectedIndex] : null;

  return (
    <div className="w-full h-full border-none shadow-none">
      <div className="p-0 flex-1 flex overflow-hidden">
        {/* 左侧 - 变量列表 */}
        <div className="w-1/3 border-r p-3 flex flex-col h-[400px]">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索环境变量"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium text-muted-foreground">
              变量列表 ({vars.length})
            </Label>
            <Button
              variant="outline"
              size="icon"
              onClick={loadEnvVars}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdd}
              className="h-7 px-2 text-xs"
              disabled={isAdding}
            >
              <Plus className="h-3 w-3 mr-1" />
              添加
            </Button>
          </div>

          <ScrollArea className="flex-1 -mr-3 pr-3">
            {filteredVars.length > 0 ? (
              <div className="space-y-1">
                {filteredVars.map((v) => {
                  const originalIndex = vars.findIndex(
                    (item) => item.key === v.key,
                  );
                  return (
                    <div
                      key={originalIndex}
                      onClick={() => setSelectedIndex(originalIndex)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer group",
                        selectedIndex === originalIndex
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Key className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-sm truncate">{v.key}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(originalIndex);
                        }}
                        className={cn(
                          "h-6 w-6 opacity-0 group-hover:opacity-100",
                          selectedIndex === originalIndex
                            ? "hover:bg-primary/80 text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
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

        {/* 右侧 - 变量值编辑 */}
        <div className="w-2/3 p-4 flex flex-col">
          {isAdding ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-1.5">
                <Label htmlFor="new-key" className="text-sm font-medium">
                  新变量名
                </Label>
                <Input
                  id="new-key"
                  placeholder="VARIABLE_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <Label htmlFor="new-value" className="text-sm font-medium">
                  变量值
                </Label>
                <Textarea
                  id="new-value"
                  placeholder="变量值"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="min-h-[200px] flex-1 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelAdd}>
                  取消
                </Button>
                <Button variant="primary" onClick={handleSaveNew}>
                  保存新变量
                </Button>
              </div>
            </div>
          ) : selectedVar ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="bg-muted/50 rounded-lg p-3 border border-muted-foreground/10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Key className="h-3.5 w-3.5" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{selectedVar.key}</p>
                    <p className="text-xs mt-1">
                      使用方式:{" "}
                      <code className="bg-muted rounded px-1 py-0.5">
                        process.env.{selectedVar.key}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <Label htmlFor="value" className="text-sm font-medium">
                  变量值
                </Label>
                <Textarea
                  id="value"
                  placeholder="变量值"
                  value={selectedVar.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="min-h-[250px] flex-1 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Badge variant="outline" className="mb-3">
                请选择或添加变量
              </Badge>
              <p className="text-sm text-muted-foreground">
                从左侧列表选择一个变量或创建新变量
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                className="mt-4"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加新变量
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || isAdding}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存所有变量
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

EnvEditor.open = () => {
  dialog({
    title: "环境变量",
    content: <EnvEditor />,
    width: 700,
    height: 600,
  });
};
