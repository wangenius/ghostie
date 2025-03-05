import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbBox, TbDownload, TbPlus, TbUpload } from "react-icons/tb";

import { Model, ModelType, ModelTypeList } from "@/common/types/model";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getColor } from "@/utils/color";
import { memo, useEffect, useState } from "react";
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
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        right={
          <>
            <Button variant="ghost" onClick={handleCreateModel}>
              <TbPlus className="w-4 h-4" />
              添加模型
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-muted/50 transition-colors"
                >
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onClick={handleImport} className="gap-2">
                  <TbUpload className="w-4 h-4" />
                  <span>导入配置</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport} className="gap-2">
                  <TbDownload className="w-4 h-4" />
                  <span>导出配置</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="模型支持: 阿里千问, deepseek, ChatGPT等gpt接口的模型。智谱或Claude等模型请等待更新。或者欢迎提交PR。"
        items={Object.values(models).map((model) => ({
          id: model.id,
          title: (
            <span className="flex">
              <span className="font-bold text-sm truncate">
                {model.name || "未命名模型"}
              </span>
              {model.type && (
                <small
                  className="ml-2 text-[10px] text-muted bg-primary/80 px-2 rounded-xl"
                  style={{
                    backgroundColor: getColor(ModelTypeList[model.type]),
                  }}
                >
                  {ModelTypeList[model.type]}
                </small>
              )}
            </span>
          ),
          description: model.model || "暂无描述",
          onClick: () => setSelectedModel(model),
          actived: selectedModel?.id === model.id,
          onRemove: () => handleDeleteModel(model.id),
        }))}
        emptyText="暂无模型，点击上方按钮添加新的模型"
        EmptyIcon={TbPlus}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="请选择一个模型或点击添加按钮创建新模型"
        isEmpty={!selectedModel}
        EmptyIcon={TbBox}
        className="px-8 py-6"
      >
        {selectedModel && (
          <ModelItem
            model={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

const ModelItem = memo(
  ({
    model,
    setSelectedModel,
  }: {
    model: Model;
    setSelectedModel: (model: Model | undefined) => void;
  }) => {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-3">
          <Input
            type="text"
            variant="title"
            spellCheck={false}
            value={model?.name || ""}
            onChange={(e) =>
              setSelectedModel({ ...model, name: e.target.value })
            }
            placeholder="为你的模型配置起个名字"
            className="w-full text-2xl font-medium"
          />

          <div className="space-y-6">
            <DrawerSelector
              title="模型类型"
              value={[model.type]}
              items={Object.entries(ModelTypeList).map(([key, value]) => ({
                label: value,
                value: key,
              }))}
              onSelect={([value]) =>
                setSelectedModel(model ? { ...model, type: value } : undefined)
              }
            />

            <div className="space-y-3 bg-muted/40 p-4 rounded-lg">
              <h3 className="text-lg font-medium tracking-tight">API 配置</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    MODEL NAME
                  </label>
                  <Input
                    type="text"
                    spellCheck={false}
                    value={model?.model}
                    onChange={(e) =>
                      setSelectedModel(
                        model ? { ...model, model: e.target.value } : undefined,
                      )
                    }
                    placeholder="如：gpt-3.5-turbo"
                    className="font-mono h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    例如：gpt-3.5-turbo
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    API URL
                  </label>
                  <Input
                    type="text"
                    spellCheck={false}
                    value={model?.api_url}
                    onChange={(e) =>
                      setSelectedModel(
                        model
                          ? {
                              ...model,
                              api_url: e.target.value,
                            }
                          : undefined,
                      )
                    }
                    placeholder="整个 API URL，包括base_url/v1/chat/completions"
                    className="font-mono h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    例如：https://api.openai.com/v1/chat/completions
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    API Key
                  </label>
                  <Input
                    type="password"
                    spellCheck={false}
                    value={model?.api_key || ""}
                    onChange={(e) =>
                      setSelectedModel(
                        model
                          ? {
                              ...model,
                              api_key: e.target.value,
                            }
                          : undefined,
                      )
                    }
                    placeholder="如需更新 API Key 请输入新的值"
                    className="font-mono h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
