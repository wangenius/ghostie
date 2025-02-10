import { Model } from "@common/types/model";
import { TbBox, TbPencil, TbTrash } from "react-icons/tb";

interface ModelItemProps {
	name: string;
	model: Model;
	onEdit: (name: string) => void;
	onDelete: (name: string) => void;
}

export function ModelItem({ name, model, onEdit, onDelete }: ModelItemProps) {
	return (
		<div className="group relative bg-card hover:bg-accent/5 border border-border rounded-lg transition-all duration-200">
			{/* 主内容区 */}
			<div className="flex items-center p-3 gap-3">
				{/* 左侧图标 */}
				<div className="shrink-0">
					<div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
						<TbBox className="w-6 h-6 text-primary" />
					</div>
				</div>

				{/* 中间信息区 */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-medium text-foreground truncate">
							{name}
						</h3>

					</div>
					<div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
						<span className="truncate">{model.model}</span>

					</div>
				</div>

				{/* 右侧操作区 */}
				<div className="shrink-0 flex items-center gap-1">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit(name);
						}}
						className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
						title="编辑模型"
					>
						<TbPencil className="w-4 h-4" />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(name);
						}}
						className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
						title="删除模型"
					>
						<TbTrash className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
} 