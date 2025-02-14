import { BotProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { BotEdit } from "@/page/edit/BotEdit";
import { TbPencil } from "react-icons/tb";

interface BotItemProps {
	bot: BotProps;
	isSelected: boolean;
	onClick: () => void;
}

export function BotItem({ bot, isSelected, onClick }: BotItemProps) {
	return (
		<div
			onClick={onClick}
			className={`
                	flex items-center gap-3 p-2.5 rounded-lg select-none group
                ${isSelected
					? 'bg-primary/10'
					: 'hover:bg-secondary'
				}`}
		>
			<div className="flex-1 min-w-0">
				<h3 className={`
                        text-xs font-bold truncate
                        ${isSelected ? 'text-primary' : 'text-foreground'}
                    `}>
					{bot.name}
				</h3>
				<p className="text-xs text-muted-foreground line-clamp-1">
					{bot.system}
				</p>
				<div className="flex items-center gap-2">

				</div>
			</div>
			<Button onClick={() => {
				BotEdit.open(bot.id);
			}} variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" size="icon">
				<TbPencil className="w-4 h-4" />
			</Button>
		</div>
	);
}