import { ModelType } from "@/common/types/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { KnowledgeStore, type Knowledge as KnowledgeType, type SearchResult } from "@/services/knowledge/KnowledgeStore";
import { ModelManager } from "@/services/model/ModelManager";
import { useState } from "react";
import { TbDatabasePlus, TbEye, TbFile, TbSearch, TbSettings, TbTrash } from "react-icons/tb";
import { getFileIcon, KnowledgeCreator } from "../history/KnowledgeCreator";
import { KnowledgePreview } from "../history/KnowledgePreview";

export function KnowledgeTab() {
    const documents = KnowledgeStore.use();
    const { ContentModel: model, SearchModel: searchModel, threshold, limit } = KnowledgeStore.useConfig();
    const models = ModelManager.use();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);


    const docs = Object.values(documents);


    const handleDelete = async (id: string) => {
        try {
            KnowledgeStore.deleteKnowledge(id);
        } catch (error) {
            console.error("删除失败", error);
        }
    };

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        try {
            const results = await KnowledgeStore.search(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("搜索失败", error);
        } finally {
            setSearchLoading(false);
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
                    <div className="relative flex-1">
                        <TbSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="输入关键词进行语义搜索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim() && !searchLoading) {
                                    handleSemanticSearch();
                                }
                            }}
                        />
                    </div>
                    <Button
                        onClick={handleSemanticSearch}
                        disabled={!searchQuery.trim() || searchLoading}
                    >
                        {searchLoading ? "搜索中..." : "搜索"}
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon">
                                <TbSettings className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>知识库模型：用来解析文本的模型，推荐异步批处理模型</Label>
                                    <Select value={model?.id} onValueChange={(value) => {
                                        const model = models[value];
                                        if (model) {
                                            KnowledgeStore.setContentModel(model);
                                        }
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择模型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(models)
                                                .filter((model) => model.type === ModelType.EMBEDDING)
                                                .map((model) => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>搜索模型：用来向量化搜索词条的模型，推荐同步模型</Label>
                                    <Select value={searchModel?.id} onValueChange={(value) => {
                                        const model = models[value];
                                        if (model) {
                                            KnowledgeStore.setSearchModel(model);
                                        }
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择模型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(models)
                                                .filter((model) => model.type === ModelType.EMBEDDING)
                                                .map((model) => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>相似度阈值</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[threshold]}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onValueChange={([value]) => KnowledgeStore.setThreshold(value)}
                                        />
                                        <span className="text-sm w-12 text-right">
                                            {(threshold * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>结果数量</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[limit]}
                                            min={1}
                                            max={50}
                                            step={1}
                                            onValueChange={([value]) => KnowledgeStore.setLimit(value)}
                                        />
                                        <span className="text-sm w-12 text-right">
                                            {limit}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>
            </div>
            {searchResults.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">搜索结果</h2>
                        <Button variant="ghost" size="sm" onClick={() => setSearchResults([])}>
                            返回文档列表
                        </Button>
                    </div>
                    <div className="grid gap-4">
                        {searchResults.map((result, index) => (
                            <div key={index} className="bg-card p-4 rounded-lg border overflow-hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className="text-sm">
                                        {result.document_name}
                                    </Badge>
                                    <Badge className="bg-primary/10 text-primary">
                                        相似度: {(result.similarity * 100).toFixed(1)}%
                                    </Badge>
                                </div>
                                <p className="text-sm leading-relaxed">
                                    {result.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">


                    <div className="grid gap-4">
                        {Object.values(documents).map((doc) => (
                            <div key={doc.id} className="bg-card p-4 rounded-lg border transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-medium mb-1">{doc.name}</h3>
                                        <div className="text-sm text-muted-foreground">
                                            版本: {doc.version} · {doc.files?.length} 个文件 ·
                                            {doc.files?.reduce((sum, file) => sum + file?.chunks.length, 0)} 个知识块 ·
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handlePreview(doc)}
                                        >
                                            <TbEye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(doc.id)}
                                        >
                                            <TbTrash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    {doc?.files?.map((file, index) => (
                                        <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                                            {getFileIcon(file.name)}
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium truncate">{file.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {file.chunks.length} 个知识块 · {file.file_type}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {docs?.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                暂无知识库，点击左上角"新建知识库"添加
                            </div>
                        )}
                    </div>
                </div>
            )}


        </div>
    );
}
