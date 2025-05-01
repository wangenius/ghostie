import { KNOWLEDGE_BODY_DATABASE } from "@/assets/const";
import { dialog } from "@/components/custom/DialogModal";
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
  KnowledgeBody,
  KnowledgeMeta,
  type SearchResult,
} from "@/knowledge/Knowledge";
import { KnowledgesStore } from "@/store/knowledges";
import { cmd } from "@utils/shell";
import { Echo, Echoa } from "echo-state";
import { useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDatabasePlus, TbDownload, TbUpload } from "react-icons/tb";
import { FileDrawer } from "./components/FileDrawer";
import { FileList } from "./components/FileList";
import { SearchResults } from "./components/SearchResults";
import { KnowledgeCreator } from "./KnowledgeCreator";
import { TabListItem } from "@/components/custom/TabListItem";

const CurrentKnowledge = new Echoa(new Knowledge());
const CurrentKnowledgeBody = new Echo<KnowledgeBody>({}).indexed({
  database: KNOWLEDGE_BODY_DATABASE,
  name: "",
});

export function KnowledgeTab() {
  const documents = KnowledgesStore.use();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeMeta | undefined>(
    undefined,
  );
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const knowledge = CurrentKnowledge.use();
  const props = documents[knowledge.meta.id];
  const files = CurrentKnowledgeBody.use();

  console.log("files", files);
  console.log("props", props);
  console.log("knowledge", knowledge);

  const handleDelete = (id: string) => {
    dialog.confirm({
      title: "Delete Knowledge Base",
      content: `Are you sure you want to delete the knowledge base "${props.name}"?`,
      okText: "Delete",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          Knowledge.delete(id);
          if (selectedDoc?.id === id) {
            setSelectedDoc(undefined);
          }
        } catch (error) {
          console.error("Delete failed", error);
        }
      },
    });
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
        await cmd.message(
          "successfully imported knowledge base configuration",
          "import success",
        );
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
      const result = await cmd.invoke<boolean>("save_file", {
        title: "Save Knowledge Base Configuration",
        filters: {
          "Knowledge Base Configuration": ["json"],
        },
        defaultName: "knowledge.json",
        content: "",
      });

      if (result) {
        await cmd.message(
          "Successfully exported knowledge base configuration",
          "Export success",
        );
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
      setSelectedFile("");
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
        right={
          <>
            <Button className="flex-1" onClick={() => KnowledgeCreator.open()}>
              <TbDatabasePlus className="w-4 h-4" />
              New
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
                  <span>Import</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Knowledge base supported: You can create a knowledge base by importing a file."
        items={Object.entries(documents).map(([id, doc]) => ({
          id,
          content: (
            <TabListItem title={doc.name} description={doc.description} />
          ),
          onClick: async () => {
            CurrentKnowledge.set(await Knowledge.get(id), {
              replace: true,
            });

            CurrentKnowledgeBody.temporary().reset();
            CurrentKnowledgeBody.indexed({
              database: KNOWLEDGE_BODY_DATABASE,
              name: id,
            }).ready();
            setSelectedDoc(doc);
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
        {selectedDoc && props.id && (
          <div key={props.id} className="flex-1 flex flex-col h-full">
            {/* 顶部区域 */}
            <div className="flex-none px-2 py-2 mb-1 bg-background/95">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Input
                    variant="title"
                    className="text-xl font-semibold pl-0 border-none focus-visible:ring-0 w-[320px] p-0 m-0 rounded-none"
                    defaultValue={props.name}
                    onChange={(e) => {
                      knowledge.updateMeta({
                        name: e.target.value,
                      });
                    }}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="bg-background/50">
                      {Object.keys(files).length} files
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Textarea
                  className="mt-3 text-sm text-muted-foreground resize-none border-none focus-visible:ring-0"
                  placeholder="Add knowledge base description..."
                  defaultValue={props.description}
                  onChange={(e) => {
                    knowledge.updateMeta({
                      description: e.target.value,
                    });
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
                key={props.id}
                files={files}
                onSelectFile={(fileName) => {
                  setSelectedFile(fileName);
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
        file={files[selectedFile]}
      />
    </PreferenceLayout>
  );
}
