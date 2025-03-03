import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TbChevronLeft } from "react-icons/tb";
import type { SearchResult } from "@/knowledge/KnowledgeStore";

interface SearchResultsProps {
  results: SearchResult[];
  onClearSearch: () => void;
}

export function SearchResults({ results, onClearSearch }: SearchResultsProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between pl-2">
        <Button variant="ghost" size="sm" onClick={onClearSearch}>
          <TbChevronLeft className="w-4 h-4" />
          返回文件列表
        </Button>
      </div>

      <div className="space-y-3 p-2">
        {results.map((result, index) => (
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
              <p className="text-sm leading-relaxed">{result.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
