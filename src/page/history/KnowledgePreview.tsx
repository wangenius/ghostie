import { Header } from "@/components/custom/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@/hook/useQuery";
import { cn } from "@/lib/utils";
import { KnowledgeStore } from "@/services/knowledge/KnowledgeStore";
import { cmd } from "@/utils/shell";
import { motion } from "framer-motion";
import { useState } from "react";
import { TbChevronRight, TbFileText, TbFolder } from "react-icons/tb";

export const KnowledgePreview = () => {
	const id = useQuery("id");
	const docs = KnowledgeStore.use();
	const [selectedFile, setSelectedFile] = useState<number | null>(null);



	const previewDocument = docs[id || ""];

	if (!previewDocument) {
		return (
			<div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
				<Header title="知识库预览" />
				<div className="flex-1 flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center space-y-3 max-w-md mx-auto p-8"
					>
						<div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
							<TbFolder className="w-8 h-8 text-primary" />
						</div>
						<h3 className="text-xl font-semibold">请选择知识库</h3>
						<p className="text-sm text-muted-foreground">从左侧列表中选择一个知识库以查看详细内容</p>
					</motion.div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/30">
			<Header title="知识库预览" />
			<div className="flex-1 overflow-hidden flex gap-6 px-4 pb-4">

				<Card className="h-full w-[360px] overflow-hidden backdrop-blur-sm bg-card/95 flex flex-col">
					<CardContent className="p-6 flex-1 overflow-hidden flex flex-col">
						<div className="space-y-6">
							<div className="space-y-2">
								<Input className="text-2xl font-bold pl-0" variant="title" value={previewDocument?.name} onChange={(e) => {
									KnowledgeStore.setName(previewDocument?.id, e.target.value);
								}} />
								<div className="flex items-center gap-2">
									<Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
										v{previewDocument?.version}
									</Badge>
								</div>
							</div>

							<div className="space-y-3">
								<Textarea
									className="min-h-[80px] resize-none"
									placeholder="添加知识库描述..."
									value={previewDocument?.description}
									onChange={(e) => {
										KnowledgeStore.setDescription(previewDocument?.id, e);
									}}
								/>
							</div>

							<div className="flex-1 overflow-y-auto">
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-semibold">文件列表</h3>
										<Badge variant="outline" className="bg-background/50">
											{previewDocument.files.length} 个文件
										</Badge>
									</div>

									<div className="space-y-2">
										{previewDocument.files.map((file, index) => (
											<div
												key={index}
												className={cn(
													"p-3 rounded-lg cursor-pointer transition-all",
													"hover:bg-muted/50",
													selectedFile === index && "bg-muted/50"
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
						{selectedFile !== null ? (
							<div className="h-full flex flex-col">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="text-xl font-semibold">{previewDocument.files[selectedFile].name}</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
												<TbFileText className="w-4 h-4" />
												<span>{previewDocument.files[selectedFile].file_type}</span>
											</div>
										</div>
										<Badge variant="outline" className="bg-background/50">
											{previewDocument.files[selectedFile].chunks.length} 个知识块
										</Badge>
									</div>
								</div>

								<div className="flex-1 overflow-y-auto">
									<div className="space-y-3">
										{previewDocument.files[selectedFile].chunks.map((chunk, index) => (
											<Card key={index} className="hover:bg-accent/5 overflow-hidden">
												<CardContent className="p-3">
													<div className="flex items-start gap-3">
														<TbChevronRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />
														<div className="flex-1 min-w-0 space-y-1.5">
															<p className="text-sm leading-relaxed">{chunk.content}</p>
															{(chunk.metadata.paragraph_number || chunk.metadata.source_page) && (
																<div className="flex items-center gap-2 text-xs text-muted-foreground">
																	{chunk.metadata.paragraph_number && (
																		<span className="bg-muted/50 px-2 py-0.5 rounded">
																			段落 #{chunk.metadata.paragraph_number}
																		</span>
																	)}
																	{chunk.metadata.source_page && (
																		<span className="bg-muted/50 px-2 py-0.5 rounded">
																			页 {chunk.metadata.source_page}
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
							</div>
						) : (
							<div className="h-full flex items-center justify-center">
								<div className="text-center space-y-3">
									<div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
										<TbFileText className="w-8 h-8 text-primary" />
									</div>
									<h3 className="text-xl font-semibold">请选择文件</h3>
									<p className="text-sm text-muted-foreground">从左侧列表中选择一个文件以查看知识块列表</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

			</div>
		</div >
	);
};

KnowledgePreview.open = (id: string) => {
	cmd.open("knowledge-preview", {
		id
	}, {
		width: 1200,
		height: 800
	});
}
