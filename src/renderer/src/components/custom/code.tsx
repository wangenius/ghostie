import { cn } from "@/lib/utils";

export const Code = ({ children, className }: { children: React.ReactNode, className?: string, }) => {
	return <code className={cn(
		"px-[.4em] py-[.2em] rounded-md !font-mono text-xs",
		"bg-muted-foreground/10",
		className
	)}>
		{children}
	</code>
};

