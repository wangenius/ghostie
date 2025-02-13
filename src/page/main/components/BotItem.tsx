import { Button } from "@/components/ui/button";
import { TbGhost3, TbInfoSquareRounded, TbRobot } from "react-icons/tb";
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
                group flex items-center gap-4 p-4 rounded-xl cursor-pointer
                transition-all duration-300 ease-in-out
                hover:shadow-sm
                ${isSelected
					? 'bg-primary/15 border border-primary/20'
					: 'hover:bg-secondary/50 border border-transparent'
				}
            `}
		>
			<Avatar className="w-12 h-12 ring-2 ring-offset-2 ring-offset-background transition-all duration-300
                    ${isSelected ? 'ring-primary/30' : 'ring-transparent'}">
				{bot.avatar ? (
					<AvatarImage src={bot.avatar} alt={bot.name} />
				) : (
					<AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/50">
						<TbGhost3 className="w-6 h-6" />
					</AvatarFallback>
				)}
			</Avatar>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<h3 className={`
                        text-base font-semibold truncate
                        transition-colors duration-300
                        ${isSelected ? 'text-primary' : 'text-foreground'}
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
						className="h-8 w-8 opacity-0 group-hover:opacity-100 
                            transition-opacity duration-300
                            hover:bg-secondary/70"
					>
						<TbInfoSquareRounded className="w-4 h-4" />
					</Button>
				</div>

				<p className="mt-1.5 text-sm text-muted-foreground/80 line-clamp-1">
					{bot.system}
				</p>
			</div>
		</div>
	);
} 