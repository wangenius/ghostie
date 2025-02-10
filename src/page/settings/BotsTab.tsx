import { BotItem } from "@/components/model/BotItem";
import { BotEdit } from "@/page/edit/BotEdit";
import { BotManager } from "@services/manager/BotManger";
import { cmd } from "@utils/shell";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";




export function BotsTab() {
    const bots = BotManager.use();

    const handleDeleteBot = async (name: string) => {
        const answer = await cmd.confirm(`确定要删除助手 "${name}" 吗？`);
        if (answer) {
            try {
                BotManager.remove(name);
            } catch (error) {
                console.error("删除助手失败:", error);
            }
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
                    {Object.entries(bots).map(([name, bot]) => (
                        <BotItem
                            key={name}
                            name={name}
                            bot={bot}
                            onEdit={() => BotEdit.open(name)}
                            onDelete={handleDeleteBot}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
