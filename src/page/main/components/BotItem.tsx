import { BotProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { BotEdit } from "@/page/edit/BotEdit";
import { BotManager } from "@/services/bot/BotManger";
import { ModelManager } from "@/services/model/ModelManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TbDots, TbPencil, TbPin, TbPinnedOff } from "react-icons/tb";
import { useState } from "react";
import { LogoIcon } from "@/components/custom/LogoIcon";

interface BotItemProps {
	bot: BotProps;
	isSelected: boolean;
	onClick: () => void;
}

export function BotItem({ bot, isSelected, onClick }: BotItemProps) {
	const [open, setOpen] = useState(false);
	const model = ModelManager.get(bot.model);

	return (
		<div
			onClick={onClick}
			className={`
                	flex items-center gap-2 p-1 rounded-lg select-none group
                ${isSelected
					? 'bg-primary/10'
					: 'hover:bg-secondary'
				}`}
		>
			<Button variant="ghost" size="icon" className="p-1.5">
				<LogoIcon />
			</Button>
			<div className={`
                        text-xs font-bold truncate space-x-4 rounded-md
                        ${isSelected ? 'text-primary' : 'text-foreground'}
                    `}>
				<span className="flex items-center gap-1">
					{bot.pinned && <TbPin className="w-3 h-3 text-primary" />}
					{bot.name}
				</span>
			</div>
			<div className="flex items-center gap-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
				{model?.model}
			</div>
			<div className="flex-1"></div>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				{bot.usageCount !== undefined && (
					<span className="px-1.5 py-0.5 bg-muted rounded">
						使用 {bot.usageCount} 次
					</span>
				)}

			</div>
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className={`
						opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-primary/10 active:bg-primary/20
						${open ? 'opacity-100' : 'opacity-0'}
					`} size="icon">
						<TbDots className="w-4 h-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						className="flex items-center gap-2"
						onClick={(e) => {
							e.stopPropagation();
							BotManager.togglePin(bot.id);
						}}
					>
						{bot.pinned ? (
							<>
								<TbPinnedOff className="w-4 h-4" />
								取消置顶
							</>
						) : (
							<>
								<TbPin className="w-4 h-4" />
								置顶
							</>
						)}
					</DropdownMenuItem>

					<DropdownMenuItem
						className="flex items-center gap-2"
						onClick={(e) => {
							e.stopPropagation();
							BotEdit.open(bot.id);
						}}
					>
						<TbPencil className="w-4 h-4" />
						编辑
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}