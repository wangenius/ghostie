import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbPlus, TbUpload } from "react-icons/tb";

export default function WorkflowsTab() {
	const handleImport = () => {
		console.log("导入");
	};

	const handleExport = () => {
		console.log("导出");
	};
	return (
		<div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button
						onClick={() => { }}
					>
						<TbPlus className="w-4 h-4" />
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
								<TbUpload className="w-4 h-4" />
								<span>导入</span>
							</DropdownMenuItem>

							<DropdownMenuItem onClick={handleExport}>
								<TbDownload className="w-4 h-4" />
								<span>导出</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
