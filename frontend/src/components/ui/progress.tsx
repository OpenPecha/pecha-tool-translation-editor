import * as React from "react";
// Using a simple div-based implementation instead of Radix UI to avoid dependency issues
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
	value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
	({ className, value = 0, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-gray-100",
				className,
			)}
			{...props}
		>
			<div
				className="h-full bg-secondary-500 transition-all"
				style={{ width: `${value ?? 0}%` }}
			/>
		</div>
	),
);
Progress.displayName = "Progress";

export { Progress };
