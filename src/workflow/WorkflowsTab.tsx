import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbEdit, TbPlus, TbTrash, TbUpload } from "react-icons/tb";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowManager } from "./WorkflowManager";
import { cmd } from "@/utils/shell";

export default function WorkflowsTab() {
	const workflows = WorkflowManager.use();

	const handleImport = () => {
		console.log("导入");
	};

	const handleExport = () => {
		console.log("导出");
	};

	const handleDelete = (id: string) => {
		WorkflowManager.state.delete(id);
		cmd.message("删除成功", "工作流已删除", "info");
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button
						onClick={() => {
							WorkflowEditor.open();
						}}
					>
						<TbPlus className="w-4 h-4 mr-1" />
						<span>新建</span>
					</Button>
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<PiDotsThreeBold className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleImport}>
								<TbUpload className="w-4 h-4 mr-2" />
								<span>导入</span>
							</DropdownMenuItem>

							<DropdownMenuItem onClick={handleExport}>
								<TbDownload className="w-4 h-4 mr-2" />
								<span>导出</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="grid gap-4">
				{Object.entries(workflows).length === 0 ? (
					<div className="text-center text-muted-foreground py-8">
						暂无工作流，点击"新建"创建一个工作流
					</div>
				) : (
					Object.entries(workflows).map(([id, workflow]) => (
						<div
							key={id}
							className="flex items-center justify-between p-4 rounded-lg border bg-card"
						>
							<div className="space-y-1">
								<h3 className="font-medium">{workflow.name}</h3>
								<p className="text-sm text-muted-foreground">
									{workflow.description || "暂无描述"}
								</p>
								<p className="text-xs text-muted-foreground">
									更新于: {new Date(workflow.updatedAt).toLocaleString()}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => WorkflowEditor.open(id)}
								>
									<TbEdit className="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDelete(id)}
								>
									<TbTrash className="w-4 h-4" />
								</Button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
