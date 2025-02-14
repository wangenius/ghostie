import { Message } from "@/common/types/model";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HistoryMessage } from "@/services/model/HistoryMessage";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbClock, TbMessageCircle, TbTrash } from "react-icons/tb";

export const HistoryPage = () => {
	const history = HistoryMessage.ChatHistory.use();
	const [current, setCurrent] = useState<string>("");
	const [selectedHistory, setSelectedHistory] = useState<{
		bot?: string;
		system: Message;
		list: Message[];
	} | null>(null);

	useEffect(() => {
		if (current) {
			setSelectedHistory(history[current]);
		}
	}, [history, current]);


	return <div className="flex flex-col h-full">
		<Header title="历史记录" />
		<div className="flex-1 overflow-hidden flex">
			{/* 左侧历史列表 */}
			<div className="h-full overflow-y-auto p-4 border-r min-w-[300px] max-w-[300px] space-y-2">
				{Object.entries(history).map(([key, value]) => (
					<div
						key={key}
						onClick={() => {
							setCurrent(key);
						}}
						className={cn(
							"p-3 rounded-lg border cursor-pointer transition-colors group",
							"hover:bg-muted/50",
							selectedHistory === value && "bg-muted/50 border-primary/50"
						)}
					>
						<div className="flex items-center justify-between mb-2 text-xs font-mono">
							<div className="flex items-center gap-2 text-muted-foreground">
								<TbClock className="h-4 w-4" />
								<span className="text-xs">
									{new Date(value.system.created_at).toLocaleString("zh-CN", {
										month: "2-digit",
										day: "2-digit",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>
							<Button
								onClick={(e) => {
									e.stopPropagation();
									HistoryMessage.deleteHistory(key);
								}}
								variant="ghost"
								size="icon"
								className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<TbTrash className="h-4 w-4" />
							</Button>
						</div>
						<h3 className="text-xs font-medium line-clamp-2 mb-1">
							{value.system.content}
						</h3>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<TbMessageCircle className="h-3.5 w-3.5" />
							<span>{value.list.length} 条对话</span>
						</div>
					</div>
				))}
			</div>

			{/* 右侧对话详情 */}
			<div className="flex-1 h-full overflow-y-auto">
				{selectedHistory ? (
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-medium">{selectedHistory.bot}</h2>
							<Button variant="outline">
								继续当前对话
							</Button>
						</div>
						<div className="space-y-4">
							{selectedHistory.list.map((message, index) => (
								<div
									key={index}
									className={cn(
										"p-4 rounded-lg",
										message.role === "user" ? "bg-background border" : "bg-muted/50"
									)}
								>
									<div className="text-xs text-muted-foreground mb-2">
										{message.role === "user" ? "用户" : "助手"}
									</div>
									<div className="text-sm whitespace-pre-wrap">
										{message.content}
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="h-full flex items-center justify-center text-muted-foreground">
						<div className="text-center">
							<TbMessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>选择一个对话查看详情</p>
						</div>
					</div>
				)}
			</div>
		</div>
	</div>;
};

HistoryPage.open = () => {
	cmd.open("history", {}, { width: 1000, height: 700 });
};

