import { Message } from "@/common/types/model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TbClock, TbCopy, TbLoader, TbTools } from "react-icons/tb";
import ReactMarkdown, { Components } from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";


interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === 'user';

	// 如果是隐藏的用户消息或function:result消息,则不渲染
	if (message.type === 'user:hidden' || message.type === 'function:result') {
		return null;
	}

	// 根据消息类型获取样式
	const getMessageStyle = () => {
		switch (message.type) {
			case 'system':
				return "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200";
			case 'assistant:loading':
				return "bg-muted/50 opacity-60";
			case 'assistant:tool':
				return "bg-purple-50 dark:bg-purple-950/30 text-sm";
			case 'function:result':
				return "bg-gray-50 dark:bg-gray-900/50 font-mono text-sm";
			default:
				return isUser ? "bg-background" : "bg-muted";
		}
	};

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

	// 添加自定义链接组件
	const CustomLink: Components['a'] = ({ href, children }) => {
		const handleClick = (e: React.MouseEvent) => {
			e.preventDefault();
			if (href) {
				window.open(href, '_blank');
			}
		};

		return (
			<a
				href={href}
				onClick={handleClick}
				className="text-primary hover:underline"
			>
				{children}
			</a>
		);
	};

	return (
		<div className={cn(
			"border-0 p-2 rounded-xl transition-colors group overflow-hidden",
			getMessageStyle()
		)}>
			<div className="max-w-3xl mx-auto flex gap-5">
				<div className="flex-1 min-w-0">
					<div className={cn(
						"text-sm px-2 select-text max-w-none dark:prose-invert",
						"text-foreground leading-6",
						message.type === 'system' && "font-medium"
					)}>
						{message.type === 'assistant:loading' ? (
							<div className="flex items-center gap-2">
								<TbLoader className="h-4 w-4 animate-spin" />
								<span>{message.content}</span>
							</div>
						) : (
							<ReactMarkdown
								components={{
									code: CodeBlock,
									a: CustomLink
								}}
							>
								{message.content}
							</ReactMarkdown>
						)}
					</div>
					<div className="text-xs text-muted-foreground items-center flex justify-between">
						{message.type === 'assistant:tool' && message.function_call
							&& <span className="flex items-center gap-1">
								<TbTools className="h-3.5 w-3.5" />
								调用工具: {message.function_call.name}
							</span>

						}
						{
							message.type === 'assistant:reply' &&
							<span className="flex items-center gap-1 px-2">
								{new Date(message.created_at).toLocaleString('zh-CN', {
									hour: '2-digit',
									minute: '2-digit',
								}).replace(/\//g, '.')}
							</span>
						}
						{
							!isUser && message.type === 'assistant:reply' &&
							<Button
								variant="ghost"
								size="icon"
								className="text-xs ml-auto text-muted-foreground hover:text-foreground hover:bg-primary/10 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={handleCopyMessage}
							>
								<TbCopy className="h-3.5 w-3.5" />
							</Button>
						}
					</div>
				</div>
			</div>
		</div>
	);
} 