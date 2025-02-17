import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { TbTrash, TbUpload } from "react-icons/tb";
import { cmd } from "@/utils/shell";

interface Knowledge {
    id: string;
    name: string;
    content: string;
    file_type: string;
    created_at: number;
    updated_at: number;
}

export function KnowledgeTab() {
    const [documents, setDocuments] = useState<Knowledge[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const list = await cmd.invoke<Knowledge[]>("get_knowledge_list");
            setDocuments(list);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async () => {
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

    return (
        <div className="space-y-6">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleUpload} disabled={loading}>
                        <TbUpload className="w-4 h-4 mr-2" />
                        <span>上传文档</span>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        className="max-w-xs"
                        placeholder="搜索文档..."
                    />
                </div>
            </div>

            {/* 文档列表 */}
            <Card>
                <CardHeader>
                    <CardTitle>知识库文档</CardTitle>
                    <CardDescription>支持上传 TXT、Markdown 文件</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>文档名称</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.name}</TableCell>
                                    <TableCell>
                                        <Badge>
                                            {doc.file_type.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(doc.updated_at * 1000).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <TbTrash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
