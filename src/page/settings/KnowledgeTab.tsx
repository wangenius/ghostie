import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload, TbFile, TbSettings, TbTag, TbTrash, TbEdit, TbEye } from "react-icons/tb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function KnowledgeTab() {
    return (
        <div className="space-y-6">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <TbPlus className="w-4 h-4 mr-2" />
                        <span>新建知识库</span>
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
                                <TbUpload className="w-4 h-4 mr-2" />
                                <span>导入</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <TbDownload className="w-4 h-4 mr-2" />
                                <span>导出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 知识库列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>通用知识库</span>
                            <Badge>活跃</Badge>
                        </CardTitle>
                        <CardDescription>包含常用文档和参考资料</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>文档数量: 42</span>
                                <span>总大小: 128MB</span>
                            </div>
                            <Progress value={65} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 知识库详情 */}
            <Card>
                <CardHeader>
                    <CardTitle>知识库详情</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="documents">
                        <TabsList>
                            <TabsTrigger value="documents">
                                <TbFile className="w-4 h-4 mr-2" />
                                文档管理
                            </TabsTrigger>
                            <TabsTrigger value="tags">
                                <TbTag className="w-4 h-4 mr-2" />
                                标签管理
                            </TabsTrigger>
                            <TabsTrigger value="settings">
                                <TbSettings className="w-4 h-4 mr-2" />
                                检索配置
                            </TabsTrigger>
                        </TabsList>

                        {/* 文档管理标签页 */}
                        <TabsContent value="documents" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Button variant="outline">
                                    <TbUpload className="w-4 h-4 mr-2" />
                                    上传文档
                                </Button>
                                <Input
                                    className="max-w-xs"
                                    placeholder="搜索文档..."
                                />
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>文档名称</TableHead>
                                        <TableHead>类型</TableHead>
                                        <TableHead>大小</TableHead>
                                        <TableHead>状态</TableHead>
                                        <TableHead>更新时间</TableHead>
                                        <TableHead>操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>产品说明书.pdf</TableCell>
                                        <TableCell>PDF</TableCell>
                                        <TableCell>2.5MB</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">已索引</Badge>
                                        </TableCell>
                                        <TableCell>2024-03-15</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon">
                                                    <TbEye className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon">
                                                    <TbEdit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon">
                                                    <TbTrash className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>

                        {/* 标签管理标签页 */}
                        <TabsContent value="tags" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Button variant="outline">
                                    <TbPlus className="w-4 h-4 mr-2" />
                                    新建标签
                                </Button>
                                <Input
                                    className="max-w-xs"
                                    placeholder="搜索标签..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">产品文档</CardTitle>
                                        <CardDescription>15个文档</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon">
                                                <TbEdit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <TbTrash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* 检索配置标签页 */}
                        <TabsContent value="settings" className="space-y-6">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Embedding 模型</Label>
                                    <select className="w-full p-2 border rounded-md">
                                        <option>text-embedding-3-small</option>
                                        <option>text-embedding-3-large</option>
                                        <option>text-embedding-ada-002</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>相似度阈值</Label>
                                    <div className="pt-2">
                                        <Slider
                                            defaultValue={[0.7]}
                                            max={1}
                                            min={0}
                                            step={0.1}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>最大上下文长度</Label>
                                    <Input type="number" defaultValue={2000} />
                                </div>

                                <div className="space-y-2">
                                    <Label>检索结果数量</Label>
                                    <Input type="number" defaultValue={5} />
                                </div>

                                <Button className="w-full">
                                    保存配置
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
