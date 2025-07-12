import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDatabasePlus } from "react-icons/tb";
import { FileDrawer } from "./components/FileDrawer";
import { KnowledgeCreator } from "./KnowledgeCreator";

export function KnowledgeTab() {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [files, setFiles] = useState<any>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string>("");

  return (
    <PreferenceLayout>
      <PreferenceSidebar
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

              <DropdownMenuContent align="end"></DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={[]}
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
                    defaultValue={selectedDoc.name}
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
                  defaultValue={selectedDoc.description}
                />
              </div>
            </div>
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
