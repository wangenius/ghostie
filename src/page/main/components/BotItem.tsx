import { Button } from "@/components/ui/button";
import { TbGhost3, TbInfoSquareRounded, TbRobot } from "react-icons/tb";
import { BotEdit } from "../../edit/BotEdit";
import { BotProps } from "@/common/types/bot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { context } from "@/components/custom/ContextMenu";
import { Menu } from "@/components/ui/menu";

interface BotItemProps {
	bot: BotProps;
	isSelected: boolean;
	onClick: () => void;
}

export function BotItem({ bot, isSelected, onClick }: BotItemProps) {
	return (
		<div
			onClick={onClick}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				context({
					event: e,
					content: (close) => {
						return <Menu items={[{
							label: "编辑",
							onClick: () => {
								BotEdit.open(bot.name);
								close();
							}
						}]}></Menu>
					}
				})
			}}
			className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer
                ${isSelected
					? 'bg-primary/10 border-primary/20'
					: 'hover:bg-secondary'
				} border border-transparent transition-colors
            `}
		>
			<Avatar className={`w-10 h-10 ring-1 transition-colors
                    ${isSelected ? 'ring-primary/30' : 'ring-transparent'}`}>
				{bot.avatar ? (
					<AvatarImage src={bot.avatar} alt={bot.name} />
				) : (
					<AvatarFallback className="bg-secondary/50">
						<TbGhost3 className="w-5 h-5" />
					</AvatarFallback>
				)}
			</Avatar>

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