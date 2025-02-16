import { BotProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { BotManager } from "@/services/bot/BotManger";
import { TbPencil, TbTrash, TbPin, TbPinFilled } from "react-icons/tb";
import { LogoIcon } from "../custom/LogoIcon";

interface ModelItemProps {
	id: string;
	bot: BotProps;
	onEdit: (name: string) => void;
	onDelete: (name: string) => void;
	isSelected?: boolean;
	onClick?: () => void;
}

export function BotItem({ id, bot, onEdit, onDelete, isSelected, onClick }: ModelItemProps) {
	const handlePinClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		BotManager.togglePin(id);
	};

	return (
		<div className="group relative hover:bg-accent/5 rounded-lg transition-all duration-200">
			{/* 主内容区 */}

			<div className="flex items-center p-2 gap-3">
				{/* 左侧图标 */}
				<div className="shrink-0">
					<div className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted">
						<LogoIcon className="w-6 h-6" />
					</div>
				</div>

				{/* 中间信息区 */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-medium text-foreground truncate">
							{bot.name}
						</h3>

					</div>
					<div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
						<span className="truncate">{bot.system}</span>
					</div>
				</div>

				{/* 右侧操作区 */}
				<div className="shrink-0 flex items-center gap-1">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit(id);
						}}
						className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
						title="编辑模型"
					>
						<TbPencil className="w-4 h-4" />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(id);
						}}
						className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
						title="删除模型"
					>
						<TbTrash className="w-4 h-4" />
					</button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handlePinClick}
					>
						{bot.pinned ? (
							<TbPinFilled className="h-4 w-4" />
						) : (
							<TbPin className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
} 