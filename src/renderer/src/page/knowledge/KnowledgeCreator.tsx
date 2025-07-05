import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Knowledge } from "@/knowledge/Knowledge";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import {
  TbCheck,
  TbFile,
  TbFileTypeDoc,
  TbFileTypePdf,
  TbLoader,
  TbMarkdown,
  TbTrash,
  TbUpload,
} from "react-icons/tb";

export const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  switch (extension) {
    case "pdf":
      return <TbFileTypePdf className="w-5 h-5" />;
    case "doc":
    case "docx":
      return <TbFileTypeDoc className="w-5 h-5" />;
    case "md":
    case "markdown":
      return <TbMarkdown className="w-5 h-5" />;
    default:
      return <TbFile className="w-5 h-5" />;
  }
};

/* 文件元数据 */
export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  modified: number;
  created: number;
  is_dir: boolean;
}

/* 知识库创建 */
export const KnowledgeCreator = ({ close }: { close: () => void }) => {
  const [selectedFiles, setSelectedFiles] = useState<Array<FileMetadata>>([]);
  const [knowledgeName, setKnowledgeName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [currentFile, setCurrentFile] = useState<string>();

  const handleFileSelect = async () => {
    try {
      /* 选择文件 */
      const filePaths = await cmd.invoke<FileMetadata[]>("open_files_path", {
        title: "Select documents",
        filters: {
          文本文件: ["txt", "md", "markdown", "docx", "doc", "pdf"],
        },
      });

      if (filePaths && filePaths.length > 0) {
        setSelectedFiles((prev) => [...prev, ...filePaths]);
      }
    } catch (error) {
      console.error("Select file failed", error);
    }
  };

  const handleConfirmUpload = async () => {
    try {
      setLoading(true);
      setUploadProgress(0);
      setUploadStatus("Preparing to upload...");

      await Knowledge.create(selectedFiles, {
        /* 知识库名称 */
        name: knowledgeName,
        /* 描述 */
        description,
        /* 上传进度 */
        onProgress: (progress) => {
          setUploadProgress(progress.progress);
          setUploadStatus(progress.status);
          setCurrentFile(progress.currentFile);
        },
      });
      setSelectedFiles([]);
      setKnowledgeName("");
      close();
    } catch (error) {
      console.error("File upload failed", error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadStatus("");
      setCurrentFile(undefined);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      <div className="rounded-lg m-0 flex-1 overflow-hidden space-y-4">
        {loading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full h-2" />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{uploadStatus}</span>
              <span>{uploadProgress.toFixed(1)}%</span>
            </div>
            {currentFile && (
              <p className="text-sm text-muted-foreground">
                Current file: {currentFile}
              </p>
            )}
          </div>
        )}

        <Input
          autoFocus
          variant="title"
          className="m-0 px-1 py-0 rounded-none"
          placeholder="Knowledge base name"
          value={knowledgeName}
          onChange={(e) => setKnowledgeName(e.target.value)}
        />

        <div>
          <Textarea
            placeholder="Knowledge base description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-[72px] resize-none"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedFiles.length > 0 &&
                `Selected ${selectedFiles.length} files`}
            </div>

            {selectedFiles.length > 0 && (
              <Button variant="ghost" onClick={handleFileSelect}>
                <TbUpload className="w-4 h-4 mr-2" />
                Add files
              </Button>
            )}
          </div>

          <div className="relative p-0 flex-1">
            {selectedFiles.length === 0 ? (
              <div
                className="w-full py-16 h-auto hover:bg-muted/30 cursor-pointer border-2 border-dashed border-muted-foreground/30 rounded-lg"
                onClick={handleFileSelect}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-primary/5 mb-4">
                    <TbUpload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2 max-w-[380px]">
                    <h3 className="font-semibold text-lg">
                      Click to select files
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Supports Txt, PDF, Word, Markdown, etc.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-[300px] w-full overflow-auto py-2">
                <ScrollArea className="absolute inset-0">
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <Card
                        key={index}
                        className="overflow-hidden border-none bg-muted hover:bg-muted-foreground/10 transition-all duration-200 shadow-none"
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/5 text-primary">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <TbTrash className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button
          size="lg"
          variant={"primary"}
          onClick={handleConfirmUpload}
          disabled={selectedFiles.length === 0 || !knowledgeName || loading}
        >
          {loading ? (
            <TbLoader className="w-4 h-4 animate-spin" />
          ) : (
            <TbCheck className="w-4 h-4" />
          )}
          {loading ? "Uploading..." : "Confirm creation"}
        </Button>
      </div>
    </div>
  );
};

KnowledgeCreator.open = () => {
  dialog({
    title: "Knowledge Base Creation",
    content: (close) => <KnowledgeCreator close={close} />,
    width: 900,
    height: 600,
  });
};
