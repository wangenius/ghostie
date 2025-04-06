import { Input } from "@/components/ui/input";
import {
  ChatModelManager,
  ChatModelProvider,
} from "@/model/chat/ChatModelManager";
import { memo } from "react";
import { ModelKey } from "../../model/key/ModelKey";
import { ModelProvider, ModelProviderList } from "../../model/types/model";
export const ModelItem = memo(
  ({
    model,
    providers,
  }: {
    model: ChatModelProvider;
    providers: ModelProviderList<ModelProvider>;
  }) => {
    // 获取当前提供商支持的模型列表
    const currentProvider = model.name;
    const supportedModels = currentProvider
      ? Object.values(providers[currentProvider].models) || []
      : [];

    const keys = ModelKey.use();

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-2 space-y-3">
          <div className="flex items-center gap-2">
            <img
              src={`/${providers[model.name]?.icon}`}
              className="w-12 h-12 p-1 rounded-lg"
              alt={providers[model.name]?.name || model.name}
            />

            <h1 className="text-2xl font-medium flex-1">
              {model.name
                ? providers[model.name]?.name || model.name
                : "base model"}
            </h1>

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
                  ChatModelManager.setApiKey(currentProvider, e.target.value)
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
