import { ModelEdit } from "@/windows/edit/ModelEdit";
import { Button } from "@/components/ui/button";
import { ModelItem } from "@components/model/ModelItem";
import { ModelManager } from "@/services/model/ModelManager";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

/* 模型管理 */

export function ModelsTab() {
    /* 获取模型 */
    const models = ModelManager.use();

    /* 删除模型 */
    const handleDeleteModel = async (name: string) => {
        const answer = await cmd.confirm(`确定要删除模型 "${name}" 吗？`);
        if (answer) {
            try {
                ModelManager.remove(name);
            } catch (error) {
                console.error("删除模型失败:", error);
            }
        }
    };



    return (
        <div className="h-full flex flex-col gap-4">


            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => ModelEdit.open()}
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


            {/* 模型列表区域 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(models).map(([name, model]) => (
                        <ModelItem
                            key={name}
                            name={name}
                            model={model}
                            onEdit={() => ModelEdit.open(name)}
                            onDelete={handleDeleteModel}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
