import { Message } from "@/common/types/model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TbCopy, TbRobot, TbUser } from "react-icons/tb";
import ReactMarkdown, { Components } from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";


interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === 'user';

	const handleCopyMessage = () => {
		navigator.clipboard.writeText(message.content);
	};

	const CodeBlock: Components['code'] = ({ className, children, ...props }) => {
		const match = /language-(\w+)/.exec(className || '');
		const isInline = !match;

		const handleCopy = () => {
			if (typeof children === 'string') {
				navigator.clipboard.writeText(children);
			}
		};

		return !isInline ? (
			<div className="relative my-4">
				<div className="rounded-xl border bg-[#282c34] overflow-hidden shadow-lg">
					<div className="flex items-center justify-between px-4 py-2 border-b border-[#393939] bg-[#21252b]">
						<span className="text-xs text-zinc-400 font-medium">
							{match[1]}
						</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
							onClick={handleCopy}
						>
							<TbCopy className="h-3.5 w-3.5" />
						</Button>
					</div>
					<div className="p-4">
						<SyntaxHighlighter
							language={match[1]}
							PreTag="div"
							className="!bg-transparent !p-0 !m-0"
							style={oneDark}
							customStyle={{
								background: 'transparent',
								padding: 0,
								margin: 0,
								fontSize: '13px',
								lineHeight: '1.6',
							}}
						>
							{String(children).replace(/\n$/, '')}
						</SyntaxHighlighter>
					</div>
				</div>
			</div>
		) : (
			<code className={cn(
				"px-[.4em] py-[.2em] rounded-md font-mono text-sm",
				"bg-muted/80",
				className
			)} {...props}>
				{children}
			</code>
		);
	};

	return (
		<div className={cn(
			"border-0 px-4 py-2 rounded-xl transition-colors group",
			isUser ? "bg-background" : "bg-muted"
		)}>

			<div className="max-w-3xl mx-auto flex gap-5">
				<div className="flex-1 min-w-0">
					<div className={cn(
						"text-sm select-text max-w-none dark:prose-invert",
						"text-foreground leading-6"
					)}>
						<ReactMarkdown components={{ code: CodeBlock }}>
							{message.content}
						</ReactMarkdown>
					</div>

					{
						!isUser &&
						<div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
								onClick={handleCopyMessage}
							>
								<TbCopy className="h-3.5 w-3.5" />
								复制内容
							</Button>
						</div>
					}
				</div>
			</div>

		</div>
	);
} 