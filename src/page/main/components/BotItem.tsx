import { BotProps } from "@/common/types/bot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { TbGhost3 } from "react-icons/tb";

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
                flex items-center gap-3 p-3 rounded-lg cursor-pointer
                ${isSelected
					? 'bg-primary/10 border-primary/20'
					: 'hover:bg-secondary'
				} border border-transparent transition-colors
            `}
		>


			<div className="flex-1 min-w-0">
				<h3 className={`
                        text-sm font-medium truncate
                        ${isSelected ? 'text-primary' : 'text-foreground'}
                    `}>
					{bot.name}
				</h3>
				<p className="mt-1 text-xs text-muted-foreground line-clamp-1">
					{bot.system}
				</p>
			</div>
		</div>
	);
} 