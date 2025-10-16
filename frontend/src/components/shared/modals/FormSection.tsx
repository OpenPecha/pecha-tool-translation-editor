import React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
	title?: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

export function FormSection({
	title,
	description,
	children,
	className,
}: FormSectionProps) {
	return (
		<div className={cn("space-y-4", className)}>
			{title && (
				<div className="space-y-1">
					<h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-300">
						{title}
					</h3>
					{description && (
						<p className="text-sm text-neutral-600 dark:text-neutral-500">
							{description}
						</p>
					)}
				</div>
			)}
			<div className="space-y-4">{children}</div>
		</div>
	);
}
