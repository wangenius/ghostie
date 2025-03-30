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
  Knowledge,
  KnowledgeMeta,
  type SearchResult,
} from "@/knowledge/Knowledge";
import { cmd } from "@utils/shell";
import { useEffect, useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDatabasePlus, TbDownload, TbUpload } from "react-icons/tb";
import { FileDrawer } from "./components/FileDrawer";
import { FileList } from "./components/FileList";
import { SearchResults } from "./components/SearchResults";
import { KnowledgeCreator } from "./KnowledgeCreator";

const instance = new Knowledge("");

export function KnowledgeTab() {
  const { list: documents } = Knowledge.useList();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeMeta | undefined>(
    undefined,
  );
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const knowledge = instance.store.use();

  useEffect(() => {
    console.log(knowledge);
  }, [knowledge]);

  const handleDelete = async (id: string) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the knowledge base "${documents[id].name}"?`,
    );
    if (answer) {
      try {
        Knowledge.delete(id);
        if (selectedDoc?.id === id) {
          setSelectedDoc(undefined);
        }
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select Knowledge Base Configuration File",
          filters: {
            "Knowledge Base Configuration": ["json"],
          },
        },
      );

      if (result) {
        // TODO: 实现导入功能
        await cmd.message("成功导入知识库配置", "导入成功");
      }
    } catch (error) {
      console.error("Import knowledge base failed:", error);
      await cmd.message(
        `Import knowledge base failed: ${error}`,
        "Import failed",
      );
    }
  };

  const handleExport = async () => {
    try {
      // TODO: 实现导出功能
      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存知识库配置",
        filters: {
          "Knowledge Base Configuration": ["json"],
        },
        defaultName: "knowledge.json",
        content: "",
      });

      if (result) {
        await cmd.message("成功导出知识库配置", "导出成功");
      }
    } catch (error) {
      console.error("Export knowledge base failed:", error);
      await cmd.message(
        `Export knowledge base failed: ${error}`,
        "Export failed",
      );
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;

    setSearchLoading(true);
    try {
      const results = await Knowledge.search(searchQuery);
      setSearchResults(results);
      setSelectedFile(null);
    } catch (error) {
      console.error("Semantic search failed:", error);
      await cmd.message(`Semantic search failed: ${error}`, "Search failed");
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
            New Knowledge Base
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
                <span>Import</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleExport}>
                <TbDownload className="w-4 h-4 mr-2" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        tips="Knowledge base supported: You can create a knowledge base by importing a file. Please refer to the development documentation for more information."
        items={Object.entries(documents).map(([id, doc]) => ({
          id,
          title: doc.name || "Unnamed Knowledge Base",
          description: doc.description?.slice(0, 50) || "No description",
          onClick: () => {
            setSelectedDoc(doc);
            instance.store.switch(id);
          },
          actived: selectedDoc?.id === id,
          onRemove: () => handleDelete(id),
        }))}
        emptyText="No knowledge base, click the button above to create a new knowledge base"
        EmptyIcon={TbDatabasePlus}
      />

      <PreferenceBody
        emptyText="No knowledge base, click the button above to create a new knowledge base"
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
                      setSelectedDoc({
                        ...selectedDoc,
                        name: e.target.value,
                      });
                      instance.setName(e.target.value);
                    }}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="bg-background/50">
                      {knowledge?.files?.length} files
                    </Badge>
                    <span>·</span>
                    <span>
                      {knowledge?.files?.reduce(
                        (acc, file) => acc + file.chunks.length,
                        0,
                      )}
                      knowledge blocks
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Textarea
                  className="mt-3 text-sm text-muted-foreground resize-none border-none focus-visible:ring-0"
                  placeholder="Add knowledge base description..."
                  defaultValue={selectedDoc?.description}
                  onChange={(e) => {
                    instance.setDescription(e.target.value);
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
                files={knowledge?.files || []}
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
        file={knowledge?.files?.[selectedFile ?? -1]}
      />
    </PreferenceLayout>
  );
}
