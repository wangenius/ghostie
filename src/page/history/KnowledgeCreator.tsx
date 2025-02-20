import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { KnowledgeStore } from "@/services/knowledge/KnowledgeStore";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbFile, TbFileTypeDoc, TbFileTypePdf, TbMarkdown, TbTrash, TbUpload } from "react-icons/tb";

export interface FileMetadata {
	path: string;
	name: string;
	size: number;
	modified: number;
	created: number;
	is_dir: boolean;
}

export const KnowledgeCreator = () => {
	const [selectedFiles, setSelectedFiles] = useState<Array<FileMetadata>>([]);
	const [knowledgeName, setKnowledgeName] = useState("");
	const [loading, setLoading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatus, setUploadStatus] = useState("");
	const [currentFile, setCurrentFile] = useState<string>();

	const handleFileSelect = async () => {
		try {
			const filePaths = await cmd.invoke<FileMetadata[]>("open_files_path", {
				title: "选择文档",
				filters: {
					"文本文件": ["txt", "md", "markdown", "docx", "doc", "pdf"]
				}
			});

			if (filePaths && filePaths.length > 0) {
				setSelectedFiles(prev => [...prev, ...filePaths]);
			}
		} catch (error) {
			console.error("选择文件失败", error);
		}
	};

	const handleConfirmUpload = async () => {
		try {
			setLoading(true);
			setUploadProgress(0);
			setUploadStatus("准备上传...");

			await KnowledgeStore.addKnowledge(selectedFiles, {
				name: knowledgeName,
				onProgress: (progress) => {
					setUploadProgress(progress.progress);
					setUploadStatus(progress.status);
					setCurrentFile(progress.currentFile);
				}
			});
			setSelectedFiles([]);
			setKnowledgeName('');
		} catch (error) {
			console.error("文件上传失败", error);
		} finally {
			setLoading(false);
			setUploadProgress(0);
			setUploadStatus("");
			setCurrentFile(undefined);
		}
	};

	const removeSelectedFile = (index: number) => {
		setSelectedFiles(prev => prev.filter((_, i) => i !== index));
	};

	const formatFileSize = (size: number) => {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	};

	const getFileIcon = (fileName: string) => {
		const extension = fileName.split('.').pop()?.toLowerCase() || '';
		switch (extension) {
			case 'pdf':
				return <TbFileTypePdf className="w-5 h-5" />;
			case 'doc':
			case 'docx':
				return <TbFileTypeDoc className="w-5 h-5" />;
			case 'md':
			case 'markdown':
				return <TbMarkdown className="w-5 h-5" />;
			default:
				return <TbFile className="w-5 h-5" />;
		}
	};

	return (
		<div className="flex flex-col h-full mx-auto justify-between pb-4">
			<Header title="知识库创建" />

			<div className="rounded-lg m-0 p-6 flex-1">
				<div className="space-y-6">
					{loading && (
						<div className="space-y-2">
							<Progress value={uploadProgress} className="w-full h-2" />
							<div className="flex justify-between items-center text-sm text-muted-foreground">
								<span>{uploadStatus}</span>
								<span>{uploadProgress.toFixed(1)}%</span>
							</div>
							{currentFile && (
								<p className="text-sm text-muted-foreground">
									当前文件: {currentFile}
								</p>
							)}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="knowledge-name" className="text-lg font-medium">
							知识库名称
						</Label>
						<Input
							id="knowledge-name"
							placeholder="请输入知识库名称"
							value={knowledgeName}
							onChange={(e) => setKnowledgeName(e.target.value)}
							className="max-w-md"
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-lg font-medium flex items-center gap-2">
								文档列表
								{selectedFiles.length > 0 && (
									<span className="text-sm text-muted-foreground font-normal">
										已选择 {selectedFiles.length} 个文件
									</span>
								)}
							</Label>

							{selectedFiles.length > 0 && (
								<Button
									variant="ghost"
									onClick={handleFileSelect}
								>
									<TbUpload className="w-4 h-4 mr-2" />
									添加文件
								</Button>
							)}
						</div>

						<div className="relative p-0">
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
												点击选择文件
											</h3>
											<p className="text-sm text-muted-foreground">
												支持 Txt、PDF、Word、Markdown 等多种格式
											</p>
										</div>
									</div>
								</div>
							) : (


								<div className="relative h-[300px] w-full overflow-auto">
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
																<p className="font-medium truncate">{file.name}</p>
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
			</div>

			<div className="flex justify-end px-6">
				<Button
					size="lg"
					onClick={handleConfirmUpload}
					disabled={selectedFiles.length === 0 || !knowledgeName || loading}
					className="min-w-[120px]"
				>
					{loading ? "上传中..." : "确认上传"}
				</Button>
			</div>
		</div>
	);
};

KnowledgeCreator.open = () => {
	cmd.open("knowledge-creator", {}, { width: 900, height: 600 });
}
