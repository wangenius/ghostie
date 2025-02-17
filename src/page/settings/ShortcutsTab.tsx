import { TbCommand, TbKeyboard } from "react-icons/tb";

export default function ShortcutsTab() {
	return (
		<div className="space-y-6 p-4">
			<h1 className="text-xl font-medium mb-6">快捷键设置</h1>

			<div className="space-y-4">
				<div className="text-sm font-medium text-muted-foreground mb-2">全局快捷键</div>
				<div className="grid gap-1">
					<ShortcutItem
						icon={<TbCommand />}
						title="打开/隐藏窗口"
						shortcut="Alt + Space"
					/>
					<ShortcutItem
						icon={<TbKeyboard />}
						title="聚焦输入框"
						shortcut="Ctrl + I"
					/>
					<ShortcutItem
						icon={<TbKeyboard />}
						title="打开历史记录"
						shortcut="Ctrl + H"
					/>
					<ShortcutItem
						icon={<TbKeyboard />}
						title="结束对话"
						shortcut="Ctrl + O"
					/>
					<ShortcutItem
						icon={<TbKeyboard />}
						title="停止生成"
						shortcut="Ctrl + P"
					/>
				</div>

				<div className="text-sm font-medium text-muted-foreground mb-2 mt-6">设置快捷键</div>
				<div className="grid gap-4">
					<ShortcutItem
						icon={<TbCommand />}
						title="打开设置"
						shortcut="Ctrl + ,"
					/>
					<ShortcutItem
						icon={<TbKeyboard />}
						title="关闭设置"
						shortcut="Esc"
					/>
				</div>
			</div>
		</div>
	);
}

interface ShortcutItemProps {
	icon: React.ReactNode;
	title: string;
	shortcut: string;
}

function ShortcutItem({ icon, title, shortcut }: ShortcutItemProps) {
	return (
		<div className="flex items-center justify-between p-2 rounded-lg bg-card">
			<div className="flex items-center gap-3">
				<div className="text-muted-foreground">
					{icon}
				</div>
				<span className="text-sm">{title}</span>
			</div>
			<div className="flex items-center gap-1">
				{shortcut.split("+").map((key, index) => (
					<>
						<kbd className="px-2 py-1 text-xs rounded bg-muted">{key.trim()}</kbd>
						{index < shortcut.split("+").length - 1 && <span className="text-muted-foreground">+</span>}
					</>
				))}
			</div>
		</div>
	);
}
