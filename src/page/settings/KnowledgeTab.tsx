import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbBrain, TbKey, TbRefresh, TbSearch, TbTrash, TbUpload, TbSettings, TbFile } from "react-icons/tb";

interface TextChunk {
    content: string;
    embedding: number[];
}

interface Knowledge {
    id: string;
    name: string;
    content: string;
    file_type: string;
    chunks: TextChunk[];
    created_at: number;
    updated_at: number;
}

interface SearchResult {
    content: string;
    similarity: number;
    document_name: string;
    document_id: string;
}

interface SearchOptions {
    threshold: number;
    limit: number;
}

export function KnowledgeTab() {
    const [documents, setDocuments] = useState<Knowledge[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("documents");
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        threshold: 0.7,
        limit: 10
    });
    const [showSearchOptions, setShowSearchOptions] = useState(false);

    useEffect(() => {
        loadDocuments();
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        try {
            const key = await cmd.invoke<string>("get_aliyun_api_key");
            setApiKey(key);
        } catch (error) {
            console.error("加载 API Key 失败", error);
        }
    };

    const saveApiKey = async () => {
        try {
            await cmd.invoke("save_aliyun_api_key", { key: apiKey });
            setShowApiKeyDialog(false);
        } catch (error) {
            console.error("保存 API Key 失败", error);
        }
    };

    const loadDocuments = async () => {
        try {
            const list = await cmd.invoke<Knowledge[]>("get_knowledge_list");
            setDocuments(list);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async () => {
        if (!apiKey) {
            setShowApiKeyDialog(true);
            return;
        }

        try {
            const result = await cmd.invoke("open_file", {
                title: "选择文档",
                filters: {
                    "文本文件": ["txt", "md", "markdown"]
                }
            });

            if (result) {
                setLoading(true);
                await cmd.invoke("upload_knowledge_file", {
                    filePath: result.path,
                    content: result.content
                });
                console.log("文件上传成功");
                await loadDocuments();
            }
        } catch (error) {
            console.error("文件上传失败", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await cmd.invoke("delete_knowledge", { id });
            console.log("删除成功");
            await loadDocuments();
        } catch (error) {
            console.error("删除失败", error);
        }
    };

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        try {
            const results = await cmd.invoke<SearchResult[]>("search_knowledge", {
                query: searchQuery,
                threshold: searchOptions.threshold,
                limit: searchOptions.limit
            });
            setSearchResults(results);
            setActiveTab("search");
        } catch (error) {
            console.error("搜索失败", error);
        } finally {
            setSearchLoading(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            {!apiKey && (
                <Alert variant="destructive">
                    <TbKey className="h-4 w-4" />
                    <AlertTitle>需要配置阿里云 API Key</AlertTitle>
                    <AlertDescription>
                        请先配置阿里云 API Key 以启用知识库功能
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            onClick={() => setShowApiKeyDialog(true)}
                        >
                            立即配置
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" onClick={handleUpload} disabled={loading}>
                    <TbUpload className="w-4 h-4 mr-2" />
                    上传文档
                </Button>
                <Button variant="outline" onClick={() => setShowApiKeyDialog(true)}>
                    <TbKey className="w-4 h-4 mr-2" />
                    配置 API Key
                </Button>
                <Button variant="outline" onClick={loadDocuments} disabled={loading}>
                    <TbRefresh className="w-4 h-4 mr-2" />
                    刷新列表
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>知识库搜索</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSearchOptions(!showSearchOptions)}
                        >
                            <TbSettings className="w-4 h-4 mr-2" />
                            搜索设置
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <TbSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder="输入关键词进行语义搜索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                            />
                        </div>
                        <Button onClick={handleSemanticSearch} disabled={!searchQuery.trim() || searchLoading}>
                            <TbBrain className="w-4 h-4 mr-2" />
                            搜索
                        </Button>
                    </div>

                    {showSearchOptions && (
                        <Card>
                            <CardContent className="grid grid-cols-2 gap-4 pt-4">
                                <div className="space-y-2">
                                    <Label>相似度阈值</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[searchOptions.threshold]}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onValueChange={([value]) => setSearchOptions({
                                                ...searchOptions,
                                                threshold: value
                                            })}
                                        />
                                        <span className="text-sm w-12 text-right">
                                            {(searchOptions.threshold * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>结果数量</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={searchOptions.limit}
                                        onChange={(e) => setSearchOptions({
                                            ...searchOptions,
                                            limit: parseInt(e.target.value)
                                        })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>知识库文档</CardTitle>
                    <CardDescription>
                        共有 {documents.length} 个文档，{documents.reduce((acc, doc) => acc + doc.chunks.length, 0)} 个知识块
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                            {filteredDocuments.map((doc) => (
                                <Card key={doc.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TbFile className="w-4 h-4" />
                                                <div>
                                                    <div className="font-medium">{doc.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {doc.chunks.length} 个知识块 · {new Date(doc.updated_at * 1000).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <TbTrash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredDocuments.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                    暂无文档
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {searchResults.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>搜索结果</CardTitle>
                        <CardDescription>
                            找到 {searchResults.length} 条相关内容
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {searchResults.map((result, index) => (
                                    <Card key={index}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline">
                                                    {result.document_name}
                                                </Badge>
                                                <Badge>
                                                    相似度: {(result.similarity * 100).toFixed(1)}%
                                                </Badge>
                                            </div>
                                            <p className="text-sm">
                                                {result.content}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>配置阿里云 API Key</DialogTitle>
                        <DialogDescription>
                            请输入您的阿里云 API Key，用于文本向量化服务
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input
                                id="api-key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                            取消
                        </Button>
                        <Button onClick={saveApiKey} disabled={!apiKey}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
