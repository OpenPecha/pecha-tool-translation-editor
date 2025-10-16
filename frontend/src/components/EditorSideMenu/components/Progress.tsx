import React from "react";

interface ProgressProps {
	value?: number;
	className?: string;
}

const Progress: React.FC<ProgressProps> = ({ value = 0, className = "" }) => (
	<div
		className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}
	>
		<div
			className="h-full bg-secondary-500 transition-all"
			style={{ width: `${value ?? 0}%` }}
		/>
	</div>
);

export default Progress;
