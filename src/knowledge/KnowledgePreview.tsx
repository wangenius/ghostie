import { AnimateSuspense } from "@/components/custom/AnimateSuspense";
import { Header } from "@/components/custom/Header";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@/hook/useQuery";
import { Knowledge, type SearchResult } from "@/knowledge/Knowledge";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbChevronRight, TbFileText, TbSearch } from "react-icons/tb";

export const KnowledgePreview = () => {
  const { value: id, setValue } = useQuery("id");
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
      <Header
        title="Knowledge Base Preview"
        close={() => {
          setValue("");
          cmd.close();
        }}
      />
      <AnimateSuspense fallback={<LoadingSpin />} minDelay={500} deps={[id]}>
        <KnowledgeContent id={id} />
      </AnimateSuspense>
    </div>
  );
};

const instance = new Knowledge("");

const KnowledgeContent = ({ id }: { id: string }) => {
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const previewDocument = instance.use();

  useEffect(() => {
    instance.switch(id);
  }, [id]);

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-muted/10 rounded-2xl flex items-center justify-center">
            <TbFileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Please select a document</h3>
          <p className="text-sm text-muted-foreground">
            Select a document from the knowledge base list to view details
          </p>
        </div>
      </div>
    );
  }

  if (!previewDocument) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-2xl flex items-center justify-center">
            <TbFileText className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-semibold">Document not found</h3>
          <p className="text-sm text-muted-foreground">
            Please confirm that the document ID is correct
          </p>
        </div>
      </div>
    );
  }

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await Knowledge.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex gap-6 px-4 pb-4">
      <Card className="h-full w-[360px] overflow-hidden backdrop-blur-sm bg-card/95 flex flex-col">
        <CardContent className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4">
            <Input
              className="text-2xl font-bold pl-0"
              variant="title"
              value={previewDocument?.meta.name}
              onChange={(e) => {
                instance.setName(e.target.value);
              }}
            />

            <div>
              <Textarea
                className="min-h-[80px] resize-none"
                placeholder="Add knowledge base description..."
                value={previewDocument?.meta.description}
                onChange={(e) => {
                  instance.setDescription(e.target.value);
                }}
              />
            </div>

            <div className="relative">
              <TbSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Enter keywords for semantic search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    searchQuery.trim() &&
                    !searchLoading
                  ) {
                    handleSemanticSearch();
                  }
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">File List</h3>
                  <Badge variant="outline" className="bg-background/50">
                    {previewDocument.files.length} files
                  </Badge>
                </div>

                <div className="space-y-2">
                  {previewDocument.files.map((file, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all",
                        "hover:bg-muted/50",
                        selectedFile === index && "bg-muted/50",
                      )}
                      onClick={() => setSelectedFile(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TbFileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{file.name}</h4>
                          <Badge variant="secondary" className="mt-1">
                            {file.file_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full flex-1 backdrop-blur-sm bg-card/95 flex flex-col">
        <CardContent className="p-6 flex-1 overflow-hidden flex flex-col">
          {searchResults.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Search Results</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchResults([])}
                >
                  Back to document content
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-sm">
                            {result.document_name}
                          </Badge>
                          <Badge className="bg-primary/10 text-primary">
                            Similarity: {(result.similarity * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {result.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedFile !== null ? (
            <div className="h-full flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {previewDocument.files[selectedFile].name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <TbFileText className="w-4 h-4" />
                      <span>
                        {previewDocument.files[selectedFile].file_type}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background/50">
                    {previewDocument.files[selectedFile].chunks.length}{" "}
                    knowledge blocks
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {previewDocument.files[selectedFile].chunks.map(
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
                                      Paragraph #
                                      {chunk.metadata.paragraph_number}
                                    </span>
                                  )}
                                  {chunk.metadata.source_page && (
                                    <span className="bg-muted/50 px-2 py-0.5 rounded">
                                      Page {chunk.metadata.source_page}
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
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                  <TbFileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Please select a file</h3>
                <p className="text-sm text-muted-foreground">
                  Select a file from the left list to view the knowledge block
                  list
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
