"use client"

import * as React from "react"
import { Check, X, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface MultiSelectProps {
	options: { label: string; value: string }[]
	value: string[]
	onChange: (value: string[]) => void
	className?: string
	placeholder?: string
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
	({ options, value, onChange, className, placeholder = "请选择..." }, ref) => {
		const [open, setOpen] = React.useState(false)

		const handleSelect = (optionValue: string) => {
			if (value.includes(optionValue)) {
				onChange(value.filter(v => v !== optionValue))
			} else {
				onChange([...value, optionValue])
			}
		}

		const removeValue = (optionValue: string) => {
			onChange(value.filter(v => v !== optionValue))
		}

		console.log(value);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<div
						className={cn(
							"flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md bg-muted p-1 text-sm focus-within:bg-muted-foreground/10 transition",
							className
						)}
						ref={ref}
					>
						{value.length > 0 ? (
							value.map(v => {
								const option = options.find(o => o.value === v)
								return (
									<div
										key={v}
										className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs"
									>
										<span>{option?.label || v}</span>
										<button
											onClick={e => {
												e.stopPropagation()
												removeValue(v)
											}}
											className="text-muted-foreground hover:text-destructive"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								)
							})
						) : (
							<div className="px-2 py-1 text-muted-foreground">{placeholder}</div>
						)}
					</div>
				</PopoverTrigger>
				<PopoverContent className="w-full p-0" align="start">
					<div className="max-h-[200px] overflow-auto p-1">
						{options.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
								<Inbox className="h-6 w-6 mb-1" />
								<span className="text-sm">暂无选项</span>
							</div>
						) : (
							options.map(option => (
								<div
									key={option.value}
									className={cn(
										"flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
										value.includes(option.value) && "bg-accent"
									)}
									onClick={() => handleSelect(option.value)}
								>
									<span>{option.label}</span>
									{value.includes(option.value) && (
										<Check className="h-4 w-4 text-accent-foreground" />
									)}
								</div>
							))
						)}
					</div>
				</PopoverContent>
			</Popover>
		)
	}
)

MultiSelect.displayName = "MultiSelect" 