import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  KnowledgeStore,
  type Knowledge as KnowledgeType,
  type SearchResult,
} from "@/knowledge/KnowledgeStore";
import { cn } from "@/lib/utils";
import { cmd } from "@utils/shell";
import { useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbChevronLeft,
  TbChevronRight,
  TbDatabasePlus,
  TbDownload,
  TbFileText,
  TbSearch,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { KnowledgeCreator } from "./KnowledgeCreator";

export function KnowledgeTab() {
  const documents = KnowledgeStore.use();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeType | undefined>();
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleDelete = async (id: string) => {
    const answer = await cmd.confirm(
      `确定要删除知识库 "${documents[id].name}" 吗？`,
    );
    if (answer) {
      try {
        KnowledgeStore.delete(id);
        if (selectedDoc?.id === id) {
          setSelectedDoc(undefined);
        }
      } catch (error) {
        console.error("删除失败", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择知识库配置文件",
          filters: {
            知识库配置: ["json"],
          },
        },
      );

      if (result) {
        // TODO: 实现导入功能
        await cmd.message("成功导入知识库配置", "导入成功");
      }
    } catch (error) {
      console.error("导入知识库失败:", error);
      await cmd.message(`导入知识库失败: ${error}`, "导入失败");
    }
  };

  const handleExport = async () => {
    try {
      // TODO: 实现导出功能
      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存知识库配置",
        filters: {
          知识库配置: ["json"],
        },
        defaultName: "knowledge.json",
        content: "",
      });

      if (result) {
        await cmd.message("成功导出知识库配置", "导出成功");
      }
    } catch (error) {
      console.error("导出知识库失败:", error);
      await cmd.message(`导出知识库失败: ${error}`, "导出失败");
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;

    setSearchLoading(true);
    try {
      const results = await KnowledgeStore.search(searchQuery);
      setSearchResults(results);
      setSelectedFile(null);
    } catch (error) {
      console.error("语义搜索失败:", error);
      await cmd.message(`语义搜索失败: ${error}`, "搜索失败");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-[400px] bg-muted flex flex-col h-full overflow-auto rounded-xl p-2 gap-2">
        <div className="flex-none flex justify-end items-center">
          <div className="flex items-center gap-2">
            <Button className="flex-1" onClick={() => KnowledgeCreator.open()}>
              <TbDatabasePlus className="w-4 h-4 mr-2" />
              新建知识库
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>导入</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>导出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 p-1">
          {Object.entries(documents).length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
              <TbDatabasePlus className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-center">
                暂无知识库，点击上方按钮创建新的知识库
              </p>
            </div>
          ) : (
            Object.entries(documents).map(([id, doc]) => (
              <div
                key={id}
                className={cn(
                  "group relative px-4 py-3 rounded-lg transition-all hover:bg-muted-foreground/10 select-none",
                  selectedDoc?.id === id
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "bg-background",
                )}
                onClick={() => {
                  setSelectedDoc(doc);
                  setSelectedFile(null);
                  setSearchResults([]);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">
                        {doc.name || "未命名知识库"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {doc.description?.slice(0, 50) || "暂无描述"}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(id);
                    }}
                  >
                    <TbTrash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧预览区域 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col px-4 ">
        {selectedDoc ? (
          <div className="flex-1 flex flex-col h-full">
            {/* 顶部区域 */}
            <div className="flex-none px-2 py-2 mb-1 bg-background/95">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Input
                    variant="title"
                    className="text-xl font-semibold pl-0 border-none focus-visible:ring-0 w-[320px] p-0 m-0 rounded-none"
                    value={selectedDoc.name || "未命名知识库"}
                    onChange={(e) => {
                      KnowledgeStore.setName(selectedDoc.id, e.target.value);
                    }}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="bg-background/50">
                      {selectedDoc.files.length} 个文件
                    </Badge>
                    <span>·</span>
                    <span>
                      {selectedDoc.files.reduce(
                        (acc, file) => acc + file.chunks.length,
                        0,
                      )}{" "}
                      个知识块
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Textarea
                  className="mt-3 text-sm text-muted-foreground resize-none border-none focus-visible:ring-0"
                  placeholder="添加知识库描述..."
                  value={selectedDoc.description}
                  onChange={(e) => {
                    KnowledgeStore.setDescription(
                      selectedDoc.id,
                      e.target.value,
                    );
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2 pl-2">
              <div className="flex items-center justify-between">
                {searchResults.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchResults([])}
                  >
                    <TbChevronLeft className="w-4 h-4" />
                    返回文件列表
                  </Button>
                )}
              </div>
              <div className="relative px-2 mb-1">
                <TbSearch className="absolute left-5 top-2.5 h-4 text-muted-foreground" />
                <Input
                  className="w-[280px] pl-9"
                  placeholder="输入关键词进行语义搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSemanticSearch();
                    }
                  }}
                />
              </div>
            </div>

            {/* 文件列表区域 */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                selectedDoc.files.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "group relative rounded-lg transition-all cursor-pointer bg-background",
                      "hover:bg-accent/50 border border-border mb-2",
                      isDrawerOpen &&
                        selectedFile === index &&
                        "ring-1 ring-primary bg-accent/50",
                    )}
                    onClick={() => {
                      setSelectedFile(index);
                      setIsDrawerOpen(true);
                      setSearchResults([]);
                    }}
                  >
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <TbFileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">
                            {file.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="bg-background/50"
                            >
                              {file.file_type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-background/50"
                            >
                              {file.chunks.length} 块
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 实现删除文件功能
                        }}
                      >
                        <TbTrash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            <TbFileText className="w-12 h-12 text-muted-foreground/50" />
            <p>请选择一个知识库或点击添加按钮创建新知识库</p>
          </div>
        )}
      </div>

      {/* 文件内容抽屉 */}
      <Drawer
        direction="right"
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        className="w-[600px]"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {selectedFile !== null && selectedDoc?.files[selectedFile] ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedDoc.files[selectedFile].name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <TbFileText className="w-4 h-4" />
                    <span>{selectedDoc.files[selectedFile].file_type}</span>
                    <Badge variant="outline" className="bg-background/50">
                      {selectedDoc.files[selectedFile].chunks.length} 个知识块
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedDoc.files[selectedFile].chunks.map(
                    (chunk, index) => (
                      <Card
                        key={index}
                        className="hover:bg-accent/5 overflow-hidden"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <TbChevronRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <p className="text-sm leading-relaxed">
                                {chunk.content}
                              </p>
                              {(chunk.metadata.paragraph_number ||
                                chunk.metadata.source_page) && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {chunk.metadata.paragraph_number && (
                                    <span className="bg-muted/50 px-2 py-0.5 rounded">
                                      段落 #{chunk.metadata.paragraph_number}
                                    </span>
                                  )}
                                  {chunk.metadata.source_page && (
                                    <span className="bg-muted/50 px-2 py-0.5 rounded">
                                      页 {chunk.metadata.source_page}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                    <TbFileText className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">请选择文件</h3>
                  <p className="text-sm text-muted-foreground">
                    从文件列表中选择一个文件以查看知识块列表
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
