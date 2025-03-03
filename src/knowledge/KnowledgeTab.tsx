import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cmd } from "@utils/shell";
import { useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDatabasePlus, TbDownload, TbUpload } from "react-icons/tb";
import { FileDrawer } from "./components/FileDrawer";
import { FileList } from "./components/FileList";
import { SearchResults } from "./components/SearchResults";
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
    <PreferenceLayout>
      <PreferenceList
        left={
          <Button className="flex-1" onClick={() => KnowledgeCreator.open()}>
            <TbDatabasePlus className="w-4 h-4" />
            新建知识库
          </Button>
        }
        right={
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
        }
        tips="知识库支持: 可以通过导入文件来创建知识库。请参考开发文档了解更多信息。"
        items={Object.entries(documents).map(([id, doc]) => ({
          id,
          title: doc.name || "未命名知识库",
          description: doc.description?.slice(0, 50) || "暂无描述",
          onClick: () => setSelectedDoc(doc),
          actived: selectedDoc?.id === id,
          onRemove: () => handleDelete(id),
        }))}
        emptyText="暂无知识库，点击上方按钮创建新的知识库"
        EmptyIcon={TbDatabasePlus}
      />

      <PreferenceBody
        emptyText="暂无知识库，点击上方按钮创建新的知识库"
        EmptyIcon={TbDatabasePlus}
        isEmpty={!selectedDoc}
      >
        {selectedDoc && (
          <div className="flex-1 flex flex-col h-full">
            {/* 顶部区域 */}
            <div className="flex-none px-2 py-2 mb-1 bg-background/95">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Input
                    variant="title"
                    className="text-xl font-semibold pl-0 border-none focus-visible:ring-0 w-[320px] p-0 m-0 rounded-none"
                    value={selectedDoc?.name}
                    onChange={(e) => {
                      const newDoc = { ...selectedDoc, name: e.target.value };
                      KnowledgeStore.setName(selectedDoc.id, e.target.value);
                      setSelectedDoc(newDoc);
                    }}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="bg-background/50">
                      {selectedDoc?.files.length} 个文件
                    </Badge>
                    <span>·</span>
                    <span>
                      {selectedDoc?.files.reduce(
                        (acc, file) => acc + file.chunks.length,
                        0,
                      )}
                      个知识块
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Textarea
                  className="mt-3 text-sm text-muted-foreground resize-none border-none focus-visible:ring-0"
                  placeholder="添加知识库描述..."
                  value={selectedDoc?.description}
                  onChange={(e) => {
                    const newDoc = {
                      ...selectedDoc,
                      description: e.target.value,
                    };
                    KnowledgeStore.setDescription(
                      selectedDoc.id,
                      e.target.value,
                    );
                    setSelectedDoc(newDoc);
                  }}
                />
              </div>
            </div>

            {searchResults.length > 0 ? (
              <SearchResults
                results={searchResults}
                onClearSearch={() => setSearchResults([])}
              />
            ) : (
              <FileList
                files={selectedDoc?.files || []}
                onSelectFile={(index) => {
                  setSelectedFile(index);
                  setIsDrawerOpen(true);
                }}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearch={handleSemanticSearch}
              />
            )}
          </div>
        )}
      </PreferenceBody>

      <FileDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        file={selectedDoc?.files[selectedFile ?? -1]}
      />
    </PreferenceLayout>
  );
}
