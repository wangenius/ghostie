import { PluginItem } from "@/components/model/PluginItem";
import { PluginEdit } from "@/page/edit/PluginEdit";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToolsManager } from "@/services/tool/ToolsManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";
import { Plugin } from "@/services/tool/ToolsManager";

/**
 * 插件管理
 */

export function PluginsTab() {
    const plugins = ToolsManager.use();

    const handleRemovePlugin = async (name: string) => {
        const answer = await cmd.confirm(`确定要删除插件 "${name}" 吗？`);

        if (answer) {
            try {
                await ToolsManager.removePlugin(name);
            } catch (error) {
                console.error("删除插件失败:", error);
            }
        }
    };

    const handleImportPlugins = async () => {
        try {
            // 打开文件选择对话框
            const result = await cmd.invoke<{ path: string; content: string }>("open_file", {
                title: "选择插件文件",
                filters: {
                    "插件文件": ["json"]
                }
            });

            if (result) {
                // 解析插件文件
                const importedPlugins = JSON.parse(result.content) as Plugin[];

                // 导入每个插件
                for (const plugin of importedPlugins) {
                    await ToolsManager.addPlugin(plugin);
                }

                cmd.message({
                    title: "导入成功",
                    message: `成功导入 ${importedPlugins.length} 个插件`,
                    buttons: ["确定"],
                    defaultId: 0,
                    cancelId: 0
                });
            }
        } catch (error) {
            console.error("导入插件失败:", error);
            cmd.message({
                title: "导入失败",
                message: `导入插件失败: ${error}`,
                buttons: ["确定"],
                defaultId: 0,
                cancelId: 0
            });
        }
    };

    const handleExportPlugins = async () => {
        try {
            // 获取所有插件数据
            const pluginsToExport = Object.values(plugins).filter(Boolean);

            // 转换为 JSON
            const pluginsJson = JSON.stringify(pluginsToExport, null, 2);

            // 打开保存文件对话框
            await cmd.invoke("save_file", {
                title: "保存插件文件",
                filters: {
                    "插件文件": ["json"]
                },
                defaultPath: "plugins.json",
                content: pluginsJson
            });

            cmd.message({
                title: "导出成功",
                message: `成功导出 ${pluginsToExport.length} 个插件`,
                buttons: ["确定"],
                defaultId: 0,
                cancelId: 0
            });
        } catch (error) {
            console.error("导出插件失败:", error);
            cmd.message({
                title: "导出失败",
                message: `导出插件失败: ${error}`,
                buttons: ["确定"],
                defaultId: 0,
                cancelId: 0
            });
        }
    };

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
                            <DropdownMenuItem onClick={() => PluginEdit.open()}>
                                <TbPlus className="w-4 h-4" />
                                <span>新建</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleImportPlugins}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={handleExportPlugins}>
                                <TbDownload className="w-4 h-4" />
                                <span>导出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                    {Object.values(plugins).map((plugin) => {
                        if (!plugin) return null;
                        return (
                            <PluginItem
                                key={plugin.name}
                                name={plugin.name}
                                description={plugin.description || ""}
                                onEdit={() => PluginEdit.open(plugin.name)}
                                onDelete={() => handleRemovePlugin(plugin.name)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
