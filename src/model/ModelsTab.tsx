import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbCards, TbDownload, TbPlus, TbTrash, TbUpload } from "react-icons/tb";

import { Model, ModelType, ModelTypeList } from "@/common/types/model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ModelsTab() {
  const models = ModelManager.use();
  const [selectedModel, setSelectedModel] = useState<Model | undefined>();

  // 自动保存功能
  useEffect(() => {
    if (selectedModel?.id) {
      try {
        ModelManager.update(selectedModel.id, selectedModel);
      } catch (error) {
        console.error("更新模型失败:", error);
      }
    }
  }, [selectedModel]);

  const handleCreateModel = () => {
    try {
      const newModel = ModelManager.add({
        name: "",
        type: ModelType.TEXT,
        model: "",
        api_url: "",
        api_key: "",
      });
      setSelectedModel(newModel);
    } catch (error) {
      console.error("添加模型失败:", error);
    }
  };

  const handleDeleteModel = async (id: string) => {
    const answer = await cmd.confirm(
      `确定要删除模型 "${models[id].name}" 吗？`,
    );
    if (answer) {
      try {
        ModelManager.remove(id);
        if (selectedModel?.id === id) {
          setSelectedModel(undefined);
        }
      } catch (error) {
        console.error("删除模型失败:", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择模型配置文件",
          filters: {
            模型配置: ["json"],
          },
        },
      );

      if (result) {
        ModelManager.import(result.content);
        await cmd.message("成功导入模型配置", "导入成功");
      }
    } catch (error) {
      console.error("导入模型失败:", error);
      await cmd.message(`导入模型失败: ${error}`, "导入失败");
    }
  };

  const handleExport = async () => {
    try {
      const modelsJson = ModelManager.export();
      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存模型配置",
        filters: {
          模型配置: ["json"],
        },
        defaultName: "models.json",
        content: modelsJson,
      });

      if (result) {
        await cmd.message("成功导出模型配置", "导出成功");
      }
    } catch (error) {
      console.error("导出模型失败:", error);
      await cmd.message(`导出模型失败: ${error}`, "导出失败");
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-[400px] bg-muted flex flex-col h-full overflow-auto rounded-xl p-2 gap-2">
        <div className="flex-none flex justify-end items-center">
          <div className="flex items-center gap-2">
            <Button className="flex-1" onClick={handleCreateModel}>
              <TbPlus className="w-4 h-4 mr-2" />
              添加模型
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>导入配置</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>导出配置</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            模型支持: 阿里千问, deepseek,
            ChatGPT等gpt接口的模型。智谱或Claude等模型请等待更新。或者欢迎提交PR。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 p-1">
          {Object.values(models).map((model) => (
            <div
              key={model.id}
              className={cn(
                "group relative px-4 py-3 rounded-lg transition-all hover:bg-muted-foreground/10 select-none",
                selectedModel?.id === model.id
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "bg-background",
              )}
              onClick={() => {
                setSelectedModel(model);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">
                      {model.name || "未命名模型"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs mono">
                      {ModelTypeList[model.type]}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    {model.model}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModel(model.id);
                  }}
                >
                  <TbTrash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {selectedModel ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                <div className="max-w-2xl mx-auto">
                  {/* 顶部标题区域 */}
                  <div className="mb-8">
                    <Input
                      type="text"
                      variant="title"
                      spellCheck={false}
                      value={selectedModel?.name || ""}
                      onChange={(e) =>
                        setSelectedModel(
                          selectedModel
                            ? { ...selectedModel, name: e.target.value }
                            : undefined,
                        )
                      }
                      placeholder="为你的模型配置起个名字"
                      className="w-full"
                    />
                  </div>

                  {/* 表单区域 - 使用卡片式设计 */}
                  <div>
                    <div className="bg-card rounded-xl p-6 border shadow-sm">
                      <h3 className="text-lg font-medium mb-4">API 配置</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            MODEL NAME
                          </label>
                          <Input
                            type="text"
                            spellCheck={false}
                            value={selectedModel?.model || ""}
                            onChange={(e) =>
                              setSelectedModel(
                                selectedModel
                                  ? { ...selectedModel, model: e.target.value }
                                  : undefined,
                              )
                            }
                            placeholder="如：gpt-3.5-turbo"
                            className="w-full font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            例如：gpt-3.5-turbo
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            API URL
                          </label>
                          <Input
                            type="text"
                            spellCheck={false}
                            value={selectedModel?.api_url || ""}
                            onChange={(e) =>
                              setSelectedModel(
                                selectedModel
                                  ? {
                                      ...selectedModel,
                                      api_url: e.target.value,
                                    }
                                  : undefined,
                              )
                            }
                            placeholder="整个 API URL，包括base_url/v1/chat/completions"
                            className="w-full font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            例如：https://api.openai.com/v1/chat/completions
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            API Key
                          </label>
                          <Input
                            type="password"
                            spellCheck={false}
                            value={selectedModel?.api_key || ""}
                            onChange={(e) =>
                              setSelectedModel(
                                selectedModel
                                  ? {
                                      ...selectedModel,
                                      api_key: e.target.value,
                                    }
                                  : undefined,
                              )
                            }
                            placeholder="如需更新 API Key 请输入新的值"
                            className="w-full font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            <TbCards className="w-12 h-12 text-muted-foreground/50" />
            <p>请选择一个模型或点击添加按钮创建新模型</p>
          </div>
        )}
      </div>
    </div>
  );
}
