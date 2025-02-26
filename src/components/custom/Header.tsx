import { cmd } from "@/utils/shell"
import { TbX } from "react-icons/tb"
import { Button } from "../ui/button"

export const Header = ({ title, close = () => cmd.close() }: { title: string, close?: () => void }) => {
	return (
		<div className="flex select-none draggable justify-between items-center p-3" >
			<span className="text-xs pl-2 text-muted-foreground">
				<img src="/icon.png" className="w-6 h-6" />
			</span>
			<div className="text-sm pl-3 flex-1 font-medium text-foreground">
				{title}
			</div>
			<Button size="icon" onClick={close} >
				<TbX className="w-4 h-4" />
			</Button>

		</div>

	)
}
