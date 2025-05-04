import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import {
  TbLoader2,
  TbPencil,
  TbPlayerPlay,
  TbPlayerStop,
  TbPlug,
  TbPlus,
  TbScriptPlus,
  TbTrash,
} from "react-icons/tb";
import { MCP, MCP_Actived, MCPStore } from "../../plugin/MCP";

const MCP_TYPES = [
  {
    label: "Node.js",
    value: "node",
    description: "使用 Node.js 运行时的 MCP 服务",
    type: "运行时",
  },
  {
    label: "Python",
    value: "python",
    description: "使用 Python 运行时的 MCP 服务",
    type: "运行时",
  },
  {
    label: "SSE",
    value: "sse",
    description: "使用 SSE 的 MCP 服务",
    type: "运行时",
  },
];

export function MCPTab() {
  const mcps = MCPStore.use();
  const [currentMCP, setCurrentMCP] = useState<MCP | null>(null);
  const actived_mcps = MCP_Actived.use();
  const [loading, setLoading] = useState(false);
  const [envDrawerOpen, setEnvDrawerOpen] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");

  return (
    <PreferenceLayout>
      <PreferenceList
        right={
          <Button
            className="flex-1"
            onClick={() => {
              MCP.create();
            }}
          >
            <TbScriptPlus className="w-4 h-4" />
            新建
          </Button>
        }
        items={Object.values(mcps).map((mcp) => ({
          id: mcp.id,
          content: (
            <div className="flex items-center justify-between gap-2 min-h-8">
              <div className="flex flex-col items-start justify-start flex-1 gap-1">
                <span className="font-bold text-sm truncate text-primary flex items-center gap-1 justify-between w-full pr-2">
                  {mcp.name || "未命名MCP"}
                  {mcp.opened && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {mcp.description}
                </span>
              </div>
            </div>
          ),
          description: mcp.description || "无描述",
          onClick: async () => {
            setCurrentMCP(await MCP.get(mcp.id));
          },
          actived: mcp.id === currentMCP?.props.id,
          onRemove: () => {
            MCP.delete(mcp.id);
          },
        }))}
        emptyText="点击上方按钮添加新mcp"
        EmptyIcon={TbPlus}
      />

      <PreferenceBody
        emptyText="请选择一个mcp或点击添加按钮创建新mcp"
        EmptyIcon={TbPlug}
        isEmpty={!currentMCP}
        className={cn("rounded-xl flex-1")}
        header={
          <div className="flex items-center justify-between w-full">
            <Input
              variant="title"
              placeholder="名称"
              value={mcps[currentMCP?.props.id || ""]?.name}
              onChange={(e) => {
                currentMCP?.update({
                  name: e.target.value,
                });
              }}
            />
            <div className="flex flex-none items-center gap-2">
              <Button
                disabled={loading}
                variant={
                  mcps[currentMCP?.props.id || ""]?.opened ? "ghost" : "primary"
                }
                onClick={async () => {
                  setLoading(true);
                  if (currentMCP) {
                    if (mcps[currentMCP?.props.id || ""]?.opened) {
                      await currentMCP.stop();
                    } else {
                      await currentMCP.start();
                    }
                  }
                  setLoading(false);
                }}
              >
                {loading ? (
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                ) : mcps[currentMCP?.props.id || ""]?.opened ? (
                  <TbPlayerStop className="w-4 h-4" />
                ) : (
                  <TbPlayerPlay className="w-4 h-4" />
                )}
                {mcps[currentMCP?.props.id || ""]?.opened ? "停止" : "启动"}
              </Button>
            </div>
          </div>
        }
      >
        <div
          key={currentMCP?.props.id}
          className="flex flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">基本信息</label>
            </div>

            <Input
              placeholder="描述"
              value={mcps[currentMCP?.props.id || ""]?.description}
              onChange={(e) => {
                currentMCP?.update({
                  description: e.target.value,
                });
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">服务设置</label>
            <small className="text-xs text-muted-foreground pl-4">
              mcp目前仅支持npx环境的stdio方式的mcp服务
            </small>
            <DrawerSelector
              title="运行时类型"
              items={MCP_TYPES}
              value={[mcps[currentMCP?.props.id || ""]?.type || "node"]}
              onSelect={(values) => {
                if (values.length > 0) {
                  currentMCP?.update({
                    type: values[0],
                  });
                }
              }}
              multiple={false}
            />

            <Input
              placeholder="服务名称"
              value={mcps[currentMCP?.props.id || ""]?.server}
              onChange={(e) => {
                currentMCP?.update({
                  server: e.target.value,
                });
              }}
            />

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">环境变量</label>
                <Button
                  size="icon"
                  onClick={() => setEnvDrawerOpen(true)}
                  className="flex items-center gap-1"
                >
                  <TbPencil className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentMCP &&
                  Object.keys(mcps[currentMCP.props.id]?.env || {}).map(
                    (key) => (
                      <div
                        key={key}
                        className="group relative p-4 bg-card rounded-xl border hover:border-primary/50 transition-all duration-200"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-primary">
                              {key}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive/10 hover:text-destructive"
                                onClick={async () => {
                                  const checked = await cmd.confirm(
                                    `确定删除环境变量 ${key} 吗？`,
                                  );
                                  if (checked) {
                                    const newEnv = {
                                      ...mcps[currentMCP.props.id]?.env,
                                    };
                                    delete newEnv[key];
                                    currentMCP.update({
                                      env: newEnv,
                                    });
                                  }
                                }}
                              >
                                <TbTrash />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </div>

            <Drawer
              open={envDrawerOpen}
              onOpenChange={setEnvDrawerOpen}
              title="编辑环境变量"
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  {currentMCP &&
                    Object.entries(mcps[currentMCP.props.id]?.env || {}).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="p-3 bg-card rounded-xl border"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-primary">
                                {key}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                  if (currentMCP) {
                                    const newEnv = {
                                      ...mcps[currentMCP.props.id]?.env,
                                    };
                                    delete newEnv[key];
                                    currentMCP.update({
                                      env: newEnv,
                                    });
                                  }
                                }}
                              >
                                <TbTrash className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              className="h-9"
                              placeholder="变量值"
                              value={value}
                              onChange={(e) => {
                                if (currentMCP) {
                                  const newEnv = {
                                    ...mcps[currentMCP.props.id]?.env,
                                    [key]: e.target.value,
                                  };
                                  currentMCP.update({
                                    env: newEnv,
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                </div>

                <div className="p-2 bg-card rounded-xl border border-dashed">
                  <div className="flex flex-col gap-3">
                    <div className="flex px-2 py-1 items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        添加新变量
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Input
                        placeholder="变量名"
                        value={newEnvKey}
                        onChange={(e) => setNewEnvKey(e.target.value)}
                        className="h-9"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            if (newEnvKey && currentMCP) {
                              const newEnv = {
                                ...mcps[currentMCP.props.id]?.env,
                                [newEnvKey]: "",
                              };
                              currentMCP.update({
                                env: newEnv,
                              });
                              setNewEnvKey("");
                            }
                          }}
                          disabled={!newEnvKey}
                          className="h-9"
                        >
                          <TbPlus className="w-4 h-4" />
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Drawer>
          </div>

          {currentMCP && actived_mcps[currentMCP.props.id]?.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                可用工具 ({actived_mcps[currentMCP.props.id]?.length})
              </label>
              <div className="grid grid-cols-2 gap-2">
                {actived_mcps[currentMCP.props.id]?.map((tool) => (
                  <div key={tool.name} className="p-2 border rounded-md">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tool.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PreferenceBody>
    </PreferenceLayout>
  );
}
