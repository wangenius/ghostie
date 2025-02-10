import { ModelEdit } from "@/components/popup/ModelEdit";
import { ModelItem } from "@components/model/ModelItem";
import { ModelManager } from "@services/manager/ModelManager";
import { cmd } from "@utils/shell";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";


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


    const handleImportModels = () => {
        // TODO: 实现模型导入功能
    };

    const handleExportModels = () => {
        // TODO: 实现模型导出功能
    };

    return (
        <div className="h-full flex flex-col gap-4">


            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => ModelEdit.open()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <TbPlus className="w-4 h-4" />
                        <span>添加模型</span>
                    </button>
                    <span className="px-2 py-0.5 text-sm rounded-full bg-muted text-muted-foreground">
                        {Object.keys(models).length} 个模型
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportModels}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                    >
                        <TbUpload className="w-4 h-4" />
                        <span>导入</span>
                    </button>
                    <button
                        onClick={handleExportModels}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                    >
                        <TbDownload className="w-4 h-4" />
                        <span>导出</span>
                    </button>

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
