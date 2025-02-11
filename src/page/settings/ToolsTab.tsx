import { ToolItem } from "@/components/model/ToolItem";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToolEdit } from "@/page/edit/ToolEdit";
import { ToolsManager } from "@/services/tool/ToolsManager";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";

/**
 * 工具管理
 */

export function ToolsTab() {
    const tools = ToolsManager.use();

    const handleRemoveTool = async (name: string) => {
        await ToolsManager.remove(name);
    };

    const handleImportPlugins = async () => {
        await ToolsManager.importFromJSON();
    };

    const handleImportTool = async () => {
        await ToolsManager.import();
    };

    const handleExportTools = async () => {
        await ToolsManager.exportToJSON();
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => ToolEdit.open()}
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
                            <DropdownMenuItem onClick={() => ToolEdit.open()}>
                                <TbPlus className="w-4 h-4" />
                                <span>新建工具</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleImportTool}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入工具</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleImportPlugins}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入配置集</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportTools}>
                                <TbDownload className="w-4 h-4" />
                                <span>导出配置集</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                    {Object.values(tools).map((tool) => {
                        if (!tool) return null;
                        return (
                            <ToolItem
                                key={tool.name}
                                name={tool.name}
                                description={tool.description || ""}
                                onEdit={() => ToolEdit.open(tool.name)}
                                onDelete={() => handleRemoveTool(tool.name)}
                            />
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
