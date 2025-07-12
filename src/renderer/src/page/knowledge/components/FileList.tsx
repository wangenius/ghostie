import { Input } from "@/components/ui/input";
import { TbSearch } from "react-icons/tb";

interface FileListProps {
  files: any;
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

      <div className="flex-1 overflow-y-auto space-y-3 p-2"></div>
    </>
  );
}
