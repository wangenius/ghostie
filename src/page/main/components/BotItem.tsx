import { Button } from "@/components/ui/button";
import { TbInfoSquare } from "react-icons/tb";
import { BotEdit } from "../../edit/BotEdit";
import { BotProps } from "@/common/types/bot";

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
                group p-3 transition-colors rounded-lg
                ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/30'}
            `}
		>
			<div className="flex items-center gap-3">
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between">
						<h3 className={`text-sm truncate ${isSelected ? 'text-primary font-medium' : 'text-foreground/70'}`}>
							{bot.name}
						</h3>
						<Button
							variant="ghost"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								BotEdit.open(bot.name);
							}}
							className="opacity-0 group-hover:opacity-100 transition-colors h-7 w-7"
						>
							<TbInfoSquare className="w-3.5 h-3.5" />
						</Button>
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground/60 line-clamp-1">{bot.system}</p>
				</div>
			</div>

			{bot.tools?.length > 0 && (
				<div className="mt-1.5 flex flex-wrap gap-1">
					{bot.tools.map((tool: string, i: number) => (
						<span
							key={i}
							className="text-[10px] text-muted-foreground/50"
						>
							{tool}
							{i < bot.tools.length - 1 && "·"}
						</span>
					))}
				</div>
			)}
		</div>
	);
} 