import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  TbDatabaseCog,
  TbLoader2,
  TbPlayerPlay,
  TbPlayerStop,
  TbPlug,
  TbPlus,
  TbScriptPlus,
} from "react-icons/tb";
import { EnvEditor } from "../plugins/EnvEditor";
import { MCP, MCP_Actived, MCPStore } from "./MCP";

export function MCPTab() {
  const mcps = MCPStore.use();
  const [currentMCP, setCurrentMCP] = useState<MCP | null>(null);
  const actived_mcps = MCP_Actived.use();
  const [loading, setLoading] = useState(false);

  return (
    <PreferenceLayout>
      <PreferenceList
        right={
          <>
            <Button onClick={() => EnvEditor.open()}>
              <TbDatabaseCog className="w-4 h-4" />
              Environment Variables
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                MCP.create();
              }}
            >
              <TbScriptPlus className="w-4 h-4" />
              新建
            </Button>
          </>
        }
        tips="mcp目前仅支持npx环境的stdio方式的mcp服务, 可能需要提前配置环境和网络服务。您可前往第三方MCP市场获取更多资源。"
        items={Object.values(mcps).map((mcp) => ({
          id: mcp.id,
          title: (
            <div className="flex items-center gap-2">
              {mcp.name || "未命名MCP"}
              {mcp.opened && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
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
            <Input
              placeholder="服务名称"
              value={mcps[currentMCP?.props.id || ""]?.server}
              onChange={(e) => {
                currentMCP?.update({
                  server: e.target.value,
                });
              }}
            />
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
