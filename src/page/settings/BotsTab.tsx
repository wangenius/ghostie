import { BotItem } from "@/components/model/BotItem";
import { BotEdit } from "@/page/edit/BotEdit";
import { BotManager } from "@/services/bot/BotManger";
import { cmd } from "@utils/shell";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";

export function BotsTab() {
    const bots = BotManager.use();

    const handleDeleteBot = async (id: string) => {
        const answer = await cmd.confirm(`确定要删除助手 "${bots[id].name}" 吗？`);
        if (answer) {
            try {
                BotManager.remove(id);
            } catch (error) {
                console.error("删除助手失败:", error);
            }
        }
    };

    /* 导入助手 */
    const handleImport = async () => {
        try {
            // 打开文件选择对话框
            const result = await cmd.invoke<{ path: string; content: string }>(
                "open_file",
                {
                    title: "选择助手配置文件",
                    filters: {
                        助手配置: ["json"],
                    },
                }
            );

            if (result) {
                // 导入助手配置
                BotManager.import(result.content);
                await cmd.message("成功导入助手配置", "导入成功");
            }
        } catch (error) {
            console.error("导入助手失败:", error);
            await cmd.message(`导入助手失败: ${error}`, "导入失败");
        }
    };

    /* 导出助手 */
    const handleExport = async () => {
        try {
            // 获取所有助手数据
            const botsJson = BotManager.export();

            // 打开保存文件对话框
            const result = await cmd.invoke<boolean>("save_file", {
                title: "保存助手配置",
                filters: {
                    助手配置: ["json"],
                },
                defaultName: "bots.json",
                content: botsJson,
            });

            if (result) {
                await cmd.message("成功导出助手配置", "导出成功");
            }
        } catch (error) {
            console.error("导出助手失败:", error);
            await cmd.message(`导出助手失败: ${error}`, "导出失败");
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => BotEdit.open()}
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
                            <DropdownMenuItem onClick={handleImport}>
                                <TbUpload className="w-4 h-4" />
                                <span>导入</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={handleExport}>
                                <TbDownload className="w-4 h-4" />
                                <span>导出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(bots).map(([id, bot]) => (
                        <BotItem
                            key={id}
                            id={id}
                            bot={bot}
                            onEdit={() => BotEdit.open(id)}
                            onDelete={handleDeleteBot}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
