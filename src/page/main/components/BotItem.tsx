import { Button } from "@/components/ui/button";
import { TbInfoSquareRounded, TbRobot } from "react-icons/tb";
import { BotEdit } from "../../edit/BotEdit";
import { BotProps } from "@/common/types/bot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";

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
                transition-colors duration-200
                ${isSelected
					? 'bg-primary/10'
					: 'hover:bg-secondary/40'
				}
            `}
		>
			<Avatar className="w-10 h-10">
				{bot.avatar ? (
					<AvatarImage src={bot.avatar} alt={bot.name} />
				) : (
					<AvatarFallback className="bg-secondary">
						<TbRobot className="w-5 h-5" />
					</AvatarFallback>
				)}
			</Avatar>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<h3 className={`
                        text-sm font-medium truncate
                        ${isSelected ? 'text-primary' : 'text-foreground/90'}
                    `}>
						{bot.name}
					</h3>

					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							BotEdit.open(bot.name);
						}}
						className="h-7 w-7 opacity-0 group-hover:opacity-100"
					>
						<TbInfoSquareRounded className="w-3.5 h-3.5" />
					</Button>
				</div>

				<p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
					{bot.system}
				</p>
			</div>
		</div>
	);
} 