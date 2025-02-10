import { cmd } from "@utils/shell";
import { TbBolt, TbPencil, TbPlus, TbTrash, TbDownload, TbUpload } from "react-icons/tb";
import { BotManager } from "@services/manager/BotManger";
import { BotEdit } from "@/components/popup/BotEdit";
import { BotProps } from "@/common/types/bot";

interface BotItemProps {
    name: string;
    bot: BotProps;
    onEdit: () => void;
    onDelete: (name: string) => void;
}

function BotItem({ name, bot, onEdit, onDelete }: BotItemProps) {
    return (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary">
            <div className="flex items-center gap-2 min-w-0">
                <div className="text-muted-foreground">
                    <TbBolt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                        {bot.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {bot.system}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-0.5 ml-2">
                <button
                    onClick={onEdit}
                    className="p-1.5 text-muted-foreground hover:text-primary"
                >
                    <TbPencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(name)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                    <TbTrash className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export function BotsTab() {
    const bots = BotManager.use();

    const handleDeleteBot = async (name: string) => {
        const answer = await cmd.confirm(`确定要删除机器人 "${name}" 吗？`);
        if (answer) {
            try {
                BotManager.remove(name);
            } catch (error) {
                console.error("删除机器人失败:", error);
            }
        }
    };

    const handleImportBots = () => {
        // TODO: 实现机器人导入功能
    };

    const handleExportBots = () => {
        // TODO: 实现机器人导出功能
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => BotEdit.open()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <TbPlus className="w-4 h-4" />
                        <span>添加机器人</span>
                    </button>
                    <span className="px-2 py-0.5 text-sm rounded-full bg-muted text-muted-foreground">
                        {Object.keys(bots).length} 个机器人
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportBots}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                    >
                        <TbUpload className="w-4 h-4" />
                        <span>导入</span>
                    </button>
                    <button
                        onClick={handleExportBots}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                    >
                        <TbDownload className="w-4 h-4" />
                        <span>导出</span>
                    </button>
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
