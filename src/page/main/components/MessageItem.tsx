import { Message } from "@/common/types/model";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === 'user';

	return (
		<div className={cn(
			"px-4 py-6 transition-colors",
			isUser ? "bg-secondary/30" : "bg-background"
		)}>
			<div className="max-w-4xl mx-auto">
				<div className="flex items-start gap-4">
					<div className={cn(
						"w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium",
						isUser ? "bg-primary text-primary-foreground" : "bg-muted"
					)}>
						{isUser ? "用" : "助"}
					</div>

					<div className="flex-1 min-w-0">
						<div className="font-medium text-sm text-foreground/80 mb-1">
							{isUser ? "用户" : "助手"}
						</div>
						<div className="prose prose-neutral dark:prose-invert max-w-none">
							<ReactMarkdown>
								{message.content}
							</ReactMarkdown>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
} 