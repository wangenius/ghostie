import { KnowledgeItem } from "@/components/model/KnowledgeItem";
import { Button } from "@/components/ui/button";
import { KnowledgeStore, type Knowledge as KnowledgeType } from "@/services/knowledge/KnowledgeStore";
import { TbDatabasePlus } from "react-icons/tb";
import { KnowledgeCreator } from "../history/KnowledgeCreator";
import { KnowledgePreview } from "../history/KnowledgePreview";

export function KnowledgeTab() {
    const documents = KnowledgeStore.use();
    const docs = Object.values(documents);

    const handleDelete = async (id: string) => {
        try {
            KnowledgeStore.delete(id);
        } catch (error) {
            console.error("删除失败", error);
        }
    };

    const handlePreview = (doc: KnowledgeType) => {
        KnowledgePreview.open(doc.id);
    };

    return (
        <div className="mx-auto space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
                    <Button onClick={() => {
                        KnowledgeCreator.open();
                    }}>
                        <TbDatabasePlus className="w-4 h-4" />
                        新建
                    </Button>
                </div>
            </div>

            <div >
                <div className="grid">
                    {Object.values(documents).map((doc) => (
                        <KnowledgeItem key={doc.id} name={doc.name} description={doc.description} onPreview={() => handlePreview(doc)} onDelete={() => handleDelete(doc.id)} />
                    ))}
                    {docs?.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                            暂无知识库，点击左上角"新建知识库"添加
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
