import { Button } from "@/components/ui/button";
import { ModelManager } from "@/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbBox, TbDownload, TbPlus, TbUpload } from "react-icons/tb";

import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ModelProvider } from "@/model/ModelManager";
import { getColor } from "@/utils/color";
import { memo, useState } from "react";

export function ModelsTab() {
  const [selectedModel, setSelectedModel] = useState<any>();
  const [isAddModelDrawerOpen, setIsAddModelDrawerOpen] = useState(false);
  // 获取所有已注册的模型提供商
  const providers = ModelManager.getProviders();

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "select model config file",
          filters: {
            模型配置: ["json"],
          },
        },
      );

      if (result) {
        ModelManager.import(result.content);
        await cmd.message(
          "model config imported successfully",
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
        title: "save model config",
        filters: {
          模型配置: ["json"],
        },
        defaultName: "models.json",
        content: modelsJson,
      });

      if (result) {
        await cmd.message(
          "model config exported successfully",
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
                  <span>import config</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport} className="gap-2">
                  <TbDownload className="w-4 h-4" />
                  <span>export config</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.values(providers).map((provider) => ({
          id: provider.name,
          title: (
            <span className="flex">
              <span className="font-bold text-sm truncate">
                {provider.name || "未命名模型"}
              </span>
              {provider.name ? (
                <small
                  className="ml-2 text-[10px] text-muted bg-primary/80 px-2 rounded-xl"
                  style={{
                    backgroundColor: getColor(provider.name),
                  }}
                >
                  {provider.name}
                </small>
              ) : (
                <small className="ml-2 text-[10px] text-muted bg-gray-500/80 px-2 rounded-xl">
                  base model
                </small>
              )}
            </span>
          ),
          description: "no description",
          onClick: () => setSelectedModel(provider),
          actived: selectedModel?.name === provider.name,
          onRemove: () => {},
          noRemove: true,
        }))}
        emptyText="no model, click the button above to add a new model"
        EmptyIcon={TbPlus}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="please choose a model or click the button above to add a new model"
        isEmpty={!selectedModel}
        EmptyIcon={TbBox}
      >
        {selectedModel && (
          <ModelItem
            model={selectedModel}
            setSelectedModel={setSelectedModel}
            providers={providers}
          />
        )}
      </PreferenceBody>

      {/* 添加模型抽屉 */}
      <Drawer
        open={isAddModelDrawerOpen}
        onOpenChange={setIsAddModelDrawerOpen}
        title="choose model provider"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            please choose a model provider, or choose "base model" to create a
            general model configuration.
          </div>

          {/* 基础模型选项 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent cursor-pointer">
            <div>
              <div className="text-sm font-medium">base model</div>
              <div className="text-xs text-muted-foreground">
                use any model in the standard OpenAI API format
              </div>
            </div>
          </div>

          {/* 提供商列表 */}
          {Object.entries(providers).map(([key, provider]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent cursor-pointer"
              onClick={() => {}}
            >
              <div>
                <div className="text-sm font-medium">{provider.name}</div>
                <div className="text-xs text-muted-foreground">
                  {provider.description}
                </div>
              </div>
              <div
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: getColor(key) }}
              >
                {key}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </PreferenceLayout>
  );
}

const ModelItem = memo(
  ({
    model,
    setSelectedModel,
    providers,
  }: {
    model: ModelProvider;
    setSelectedModel: (model: ModelProvider | undefined) => void;
    providers: Record<string, ModelProvider>;
  }) => {
    // 获取当前提供商支持的模型列表
    const currentProvider = model.name;
    const supportedModels = currentProvider
      ? Object.values(providers[currentProvider].models) || []
      : [];

    const keys = ModelManager.use();

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-2 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              variant="title"
              spellCheck={false}
              value={model?.name || ""}
              onChange={(e) =>
                setSelectedModel({ ...model, name: e.target.value })
              }
              placeholder="give your model a name"
              className="w-full text-2xl font-medium"
            />

            <span className="text-xs flex-none bg-primary/10 px-2 py-0.5 rounded-full">
              {model.name
                ? providers[model.name]?.name || model.name
                : "base model"}
            </span>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                API KEY
              </label>
              <Input
                type="password"
                spellCheck={false}
                value={keys[currentProvider] || ""}
                onChange={(e) =>
                  ModelManager.setApiKey(currentProvider, e.target.value)
                }
                placeholder="if you need to update the API key, please enter the new value"
                className="font-mono h-10"
              />
            </div>
            <div className="space-y-3 rounded-lg">
              {currentProvider && supportedModels.length > 0 && (
                <div className="mt-6 space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Models
                  </label>
                  <div className="space-y-3">
                    {supportedModels.map((modelInfo) => (
                      <div
                        key={modelInfo.name}
                        className="rounded-lg bg-muted p-3 border-border"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">{modelInfo.name}</div>
                          {modelInfo.type && (
                            <div className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground rounded-full">
                              {modelInfo.type}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {modelInfo.description || "no description"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {modelInfo.contextWindow && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                context window:
                              </span>
                              <span>
                                {modelInfo.contextWindow.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              stream output:
                            </span>
                            <span>{modelInfo.supportStream ? "✓" : "✗"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              JSON mode:
                            </span>
                            <span>{modelInfo.supportJson ? "✓" : "✗"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              tool calls:
                            </span>
                            <span>
                              {modelInfo.supportToolCalls ? "✓" : "✗"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              reasoner:
                            </span>
                            <span>{modelInfo.supportReasoner ? "✓" : "✗"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
