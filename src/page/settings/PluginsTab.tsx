import { PluginProps } from "@/common/types/plugin";
import { PluginItem } from "@/components/model/ToolItem";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PluginEdit } from "@/page/edit/PluginEdit";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { useCallback, useEffect } from 'react';
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDatabaseCog, TbPlus, TbUpload } from "react-icons/tb";
import { EnvEdit } from "../edit/EnvEdit";

/* 插件列表 */
export const PluginsStore = new Echo<Record<string, PluginProps>>({}, {
    name: "plugins",
    sync: true
})

export function PluginsTab() {
    /* 插件列表 */
    const plugins = PluginsStore.use();
    // 加载插件列表
    const loadPlugins = useCallback(async () => {
        try {
            /* 获取工具列表 */
            const plugins = await cmd.invoke<Record<string, PluginProps>>("plugins_list");
            PluginsStore.set(plugins);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            cmd.message(`加载插件列表失败: ${message}`, "error");
        }
    }, []);

    // 初始加载
    useEffect(() => {
        loadPlugins();
    }, [loadPlugins]);

    const handleRemovePlugin = async (id: string) => {
        try {
            const confirm = await cmd.confirm("确定删除插件吗？");
            if (!confirm) return;
            await cmd.invoke("plugin_remove", { id });
            PluginsStore.delete(id);
        } catch (error) {
            console.error("删除插件失败:", error);
            cmd.message("删除插件失败", "error");
        }
    };

    // 导入工具
    const handleImportPlugin = useCallback(async () => {
        try {
            const result = await cmd.invoke<{ path: string; content: string }>(
                "open_file",
                {
                    title: "选择 TypeScript 插件文件",
                    filters: { TypeScript文件: ["ts"] }
                }
            );

            if (!result?.content) return;

            const pluginInfo = await cmd.invoke<PluginProps>("plugin_import", {
                content: result.content.trim()
            });

            await loadPlugins();
            cmd.message(`成功导入插件: ${pluginInfo.name}`, "success");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            cmd.message(`导入插件失败: ${message}`, "error");
        }
    }, [loadPlugins]);

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => PluginEdit.open()}
                    >
                        <TbPlus className="w-4 h-4" />
                        <span>新建</span>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <PiDotsThreeBold className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => EnvEdit.open()}>
                                <TbDatabaseCog className="w-4 h-4" />
                                <span>环境变量</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleImportPlugin}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入 TypeScript 插件</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1">
                    {Object.values(plugins).map((plugin) => {
                        if (!plugin) return null;
                        return (
                            <PluginItem
                                key={plugin.id}
                                name={plugin.name}
                                description={plugin.description || ""}
                                onEdit={() => PluginEdit.open(plugin.id)}
                                onDelete={() => handleRemovePlugin(plugin.id)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
