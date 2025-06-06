import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { TbChevronRight, TbFileText } from "react-icons/tb";
import type { KnowledgeFile } from "@/knowledge/Knowledge";

interface FileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: KnowledgeFile;
}

export function FileDrawer({ open, onOpenChange, file }: FileDrawerProps) {
  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={onOpenChange}
      className="w-[600px]"
      title={
        <div className="p-3">
          <h3 className="text-lg font-semibold">{file?.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <TbFileText className="w-4 h-4" />
            <span>{file?.file_type}</span>
            <Badge variant="outline" className="bg-background/50">
              {file?.chunks.length} knowledge blocks
            </Badge>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-2">
          {file ? (
            <div className="space-y-6">
              <div className="space-y-3">
                {file.chunks.map((chunk, index) => (
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
                                  Paragraph #{chunk.metadata.paragraph_number}
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
                ))}
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
                  Select a file from the file list to view the knowledge block
                  list
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
