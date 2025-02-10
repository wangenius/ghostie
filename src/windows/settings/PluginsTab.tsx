import { PluginItem } from "@/components/model/PluginItem";
import { PluginEdit } from "@/windows/edit/PluginEdit";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PluginManager } from "@services/manager/PluginManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";

/**
 * 插件管理
 */

export function PluginsTab() {
    const plugins = PluginManager.use();

    const handleRemovePlugin = async (name: string) => {
        const answer = await cmd.confirm(`确定要删除插件 "${name}" 吗？`);

        if (answer) {
            try {
                await PluginManager.removePlugin(name);
            } catch (error) {
                console.error("删除插件失败:", error);
            }
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
                            <DropdownMenuItem>

                                <TbUpload className="w-4 h-4" />
                                <span>导入</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem>
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
                                key={plugin.name} name={plugin?.name} description={plugin.description || ""} onEdit={() => { PluginEdit.open(plugin.name) }} onDelete={() => { handleRemovePlugin(plugin.name) }} />
                        )
                    })}
                </div>
            </div>




        </div>
    );
}
