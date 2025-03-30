import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbBox, TbDownload, TbPlus, TbUpload } from "react-icons/tb";

import { Model, ModelType, ModelTypeList } from "@/model/types/model";
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
        console.error("update model error:", error);
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
      console.error("add model error:", error);
    }
  };

  const handleDeleteModel = async (id: string) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the model "${models[id].name}"?`,
    );
    if (answer) {
      try {
        ModelManager.remove(id);
        if (selectedModel?.id === id) {
          setSelectedModel(undefined);
        }
      } catch (error) {
        console.error("delete model error:", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select Model Configuration File",
          filters: {
            模型配置: ["json"],
          },
        },
      );

      if (result) {
        ModelManager.import(result.content);
        await cmd.message(
          "Successfully imported model configuration",
          "import success",
        );
      }
    } catch (error) {
      console.error("import model error:", error);
      await cmd.message(`import model error: ${error}`, "import failed");
    }
  };

  const handleExport = async () => {
    try {
      const modelsJson = ModelManager.export();
      const result = await cmd.invoke<boolean>("save_file", {
        title: "Save Model Configuration",
        filters: {
          模型配置: ["json"],
        },
        defaultName: "models.json",
        content: modelsJson,
      });

      if (result) {
        await cmd.message(
          "Successfully exported model configuration",
          "export success",
        );
      }
    } catch (error) {
      console.error("export model error:", error);
      await cmd.message(`export model error: ${error}`, "export failed");
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
              Add Model
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
                  <span>Import Configuration</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport} className="gap-2">
                  <TbDownload className="w-4 h-4" />
                  <span>Export Configuration</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Model supported: Ali Qianwen, Deepseek, ChatGPT, etc. Zhipu or Claude models please wait for updates. Or welcome to submit PR."
        items={Object.values(models).map((model) => ({
          id: model.id,
          title: (
            <span className="flex">
              <span className="font-bold text-sm truncate">
                {model.name || "Unnamed Model"}
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
          description: model.model || "No description",
          onClick: () => setSelectedModel(model),
          actived: selectedModel?.id === model.id,
          onRemove: () => handleDeleteModel(model.id),
        }))}
        emptyText="No model, click the button above to add a new model"
        EmptyIcon={TbPlus}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select a model or click the add button to create a new model"
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
            placeholder="Give your model a name"
            className="w-full text-2xl font-medium"
          />

          <div className="space-y-6">
            <DrawerSelector
              title="Model Type"
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
              <h3 className="text-lg font-medium tracking-tight">
                API Configuration
              </h3>
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
                    For example: gpt-3.5-turbo
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
                    For example: https://api.openai.com/v1/chat/completions
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
                    placeholder="If you need to update the API Key, please enter a new value"
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
