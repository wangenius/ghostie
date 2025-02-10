import { cmd } from "@utils/shell";
import { TbBolt, TbPencil, TbPlus, TbTrash } from "react-icons/tb";
import { BotManager } from "@services/manager/BotManger";
import { BotEdit } from "@/components/popup/BotEdit";



export function BotsTab() {
    const bots = BotManager.use();




    const handleDeleteBot = async (name: string) => {
        try {
            const answer = await cmd.confirm(`确定要删除机器人 "${name}" 吗？`);
            if (answer) {
                BotManager.remove(name);
            }

        } catch (error) {
            console.error("删除机器人失败:", error);
        }

    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => BotEdit.open()}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                    <TbPlus className="w-4 h-4" />

                    <span className="text-sm font-medium">添加机器人</span>
                </button>

                {Object.entries(bots).map(([name, bot]) => (
                    <div
                        key={name}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary"

                    >
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
                                onClick={() => BotEdit.open(name)}
                                className="p-1.5 text-muted-foreground hover:text-primary"
                            >
                                <TbPencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleDeleteBot(name)}
                                className="p-1.5 text-muted-foreground hover:text-destructive"
                            >

                                <TbTrash className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
