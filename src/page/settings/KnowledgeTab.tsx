import { ModelType } from "@/common/types/model";
import { Code } from "@/components/custom/code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { KnowledgeStore, type Knowledge as KnowledgeType, type SearchResult } from "@/services/knowledge/KnowledgeStore";
import { ModelManager } from "@/services/model/ModelManager";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbEye, TbFile, TbSearch, TbSettings, TbTrash, TbUpload } from "react-icons/tb";
import ReactMarkdown from "react-markdown";

export function KnowledgeTab() {
    const { model, items: documents, threshold, limit } = KnowledgeStore.use();
    const models = ModelManager.use();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [previewDocument, setPreviewDocument] = useState<KnowledgeType | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [knowledgeName, setKnowledgeName] = useState("");

    const handleUpload = async () => {
        if (!model) {
            cmd.message("未配置模型");
            return;
        }

        try {
            const filePaths = await cmd.invoke<string[]>("open_files_path", {
                title: "选择文档",
                filters: {
                    "文本文件": ["txt", "md", "markdown", "docx", "doc", "pdf"]
                }
            });

            if (filePaths && filePaths.length > 0) {
                setSelectedFiles(prev => [...prev, ...filePaths]);
                setShowUploadDialog(true);
            }
        } catch (error) {
            console.error("选择文件失败", error);
        }
    };

    const handleConfirmUpload = async () => {
        try {
            setLoading(true);
            await KnowledgeStore.addKnowledge(selectedFiles, {
                name: knowledgeName
            });
            setSelectedFiles([]);
            setKnowledgeName('');
            setShowUploadDialog(false);
        } catch (error) {
            console.error("文件上传失败", error);
        } finally {
            setLoading(false);
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDelete = async (id: string) => {
        try {
            KnowledgeStore.deleteKnowledge(id);
        } catch (error) {
            console.error("删除失败", error);
        }
    };

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) return;
        if (!model) {
            cmd.message("未配置模型");
            return;
        }

        setSearchLoading(true);
        try {
            const results = await KnowledgeStore.searchKnowledge(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("搜索失败", error);
        } finally {
            setSearchLoading(false);
        }
    };

    const handlePreview = (doc: KnowledgeType) => {
        setPreviewDocument(doc);
        setShowPreviewDialog(true);
    };

    return (
        <div className="mx-auto space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
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
                                    <Label>模型</Label>
                                    <Select value={model?.id} onValueChange={(value) => {
                                        const model = models[value];
                                        if (model) {
                                            KnowledgeStore.setModel(model);
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
                    <Button onClick={handleUpload} disabled={loading}>
                        <TbUpload className="w-4 h-4 mr-2" />
                        上传文档
                    </Button>
                </div>
            </div>
            <div className="text-xs text-gray-500 bg-muted p-2 rounded-md">

                知识库文档当前仅支持<Code>txt</Code>, <Code>markdown</Code>, <Code>word</Code>, <Code>pdf</Code>格式, 其他格式正在适配更新。

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
                        {documents.map((doc) => (
                            <div key={doc.id} className="bg-card p-4 rounded-lg border transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-medium mb-1">{doc.name}</h3>
                                        <div className="text-sm text-muted-foreground">
                                            版本: {doc.version} · {doc.files.length} 个文件 ·
                                            {doc.files.reduce((sum, file) => sum + file.chunks.length, 0)} 个知识块 ·
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
                                    {doc.files.map((file, index) => (
                                        <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                                            <TbFile className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
                        {documents.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                暂无文档，点击右上角"上传文档"添加
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{previewDocument?.name}</DialogTitle>
                        <DialogDescription>
                            {previewDocument && (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge>{previewDocument.version}</Badge>
                                    <span>创建于 {new Date(previewDocument.created_at).toLocaleString()}</span>
                                    <span>·</span>
                                    <span>更新于 {new Date(previewDocument.updated_at).toLocaleString()}</span>
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] mt-4">
                        {previewDocument && (
                            <div className="space-y-6">
                                {previewDocument.files.map((file, fileIndex) => (
                                    <div key={fileIndex} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <TbFile className="w-4 h-4" />
                                            <h3 className="font-medium">{file.name}</h3>
                                            <Badge variant="outline">{file.file_type}</Badge>
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <pre className="whitespace-pre-wrap font-mono text-sm">
                                                {file.content}
                                            </pre>
                                        </div>
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium mb-2">知识块列表</h4>
                                            <div className="space-y-2">
                                                {file.chunks.map((chunk, index) => (
                                                    <Card key={index}>
                                                        <CardContent className="p-3">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <p className="text-sm flex-1">{chunk.content}</p>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {chunk.metadata.paragraph_number && `#${chunk.metadata.paragraph_number}`}
                                                                    {chunk.metadata.source_page && ` · 页 ${chunk.metadata.source_page}`}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                            关闭
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>上传文档</DialogTitle>
                        <DialogDescription>
                            已选择 {selectedFiles.length} 个文件，您可以继续添加更多文件或开始上传
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="knowledge-name">知识库名称</Label>
                            <Input
                                id="knowledge-name"
                                placeholder="请输入知识库名称"
                                value={knowledgeName}
                                onChange={(e) => setKnowledgeName(e.target.value)}
                            />
                        </div>
                    </div>
                    <ScrollArea className="h-[200px] mt-4">
                        <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                                <Card key={index}>
                                    <CardContent className="p-3 flex justify-between items-center">
                                        <span className="text-sm truncate flex-1">{file}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeSelectedFile(index)}
                                        >
                                            <TbTrash className="w-4 h-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="flex justify-between">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleUpload}>
                                <TbUpload className="w-4 h-4 mr-2" />
                                继续添加
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setSelectedFiles([]);
                                setKnowledgeName('');
                            }}>
                                清空列表
                            </Button>
                        </div>
                        <Button onClick={handleConfirmUpload} disabled={selectedFiles.length === 0 || loading}>
                            {loading ? "上传中..." : "确认上传"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
