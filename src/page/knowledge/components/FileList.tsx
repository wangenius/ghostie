import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KnowledgeBody } from "@/knowledge/Knowledge";
import { cn } from "@/lib/utils";
import { TbFileText, TbSearch, TbTrash } from "react-icons/tb";

interface FileListProps {
  files: KnowledgeBody;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  onSelectFile: (fileName: string) => void;
}

export function FileList({
  files,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onSelectFile,
}: FileListProps) {
  return (
    <>
      <div className="flex justify-between gap-2 pl-2">
        <div className="flex items-center justify-between"></div>
        <div className="relative px-2 mb-1">
          <TbSearch className="absolute left-5 top-2.5 h-4 text-muted-foreground" />
          <Input
            className="w-[280px] pl-9"
            placeholder="Enter keywords for semantic search..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch();
              }
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {Object.values(files).map((file) => (
          <div
            key={file.name}
            className={cn(
              "group relative rounded-lg transition-all cursor-pointer bg-background",
              "hover:bg-accent/50 border border-border mb-2",
            )}
            onClick={() => onSelectFile(file.name)}
          >
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <TbFileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-sm">{file.name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-background/50">
                      {file.file_type}
                    </Badge>
                    <Badge variant="outline" className="bg-background/50">
                      {file.chunks.length} knowledge blocks
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
                }}
              >
                <TbTrash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
