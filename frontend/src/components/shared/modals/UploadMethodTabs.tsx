import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

import { File } from "lucide-react";
import { MdApi } from "react-icons/md";

export type UploadMethod = "empty" | "file" | "openpecha" | "ai";

interface UploadMethodTabsProps {
	readonly activeMethod: UploadMethod;
	readonly onMethodChange: (method: UploadMethod) => void;
	readonly children: React.ReactNode;
	readonly availableMethods?: UploadMethod[];
	readonly className?: string;
}

interface TabConfig {
	value: UploadMethod;
	label: string;
	disabled?: boolean;
	comingSoon?: boolean;
	icon?: React.ReactNode;
}

export function UploadMethodTabs({
	activeMethod,
	onMethodChange,
	children,
	availableMethods,
	className,
}: UploadMethodTabsProps) {
	const { t } = useTranslation();

	const tabConfigs: Record<UploadMethod, TabConfig> = {
		empty: {
			value: "empty",
			label: "Empty Document",
			icon: <span className="text-base">📄</span>,
		},
		file: {
			value: "file",
			label: t("common.file"),
			icon: <File size={16} className="text-gray-600" />,
		},
		openpecha: {
			value: "openpecha",
			label: t("common.openpecha"),
			icon: <MdApi size={16} className="text-gray-600" />,
		},
		ai: {
			value: "ai",
			label: "AI Generate",
			icon: <span className="text-base">✨</span>,
		},
	};

	const visibleTabs = availableMethods?.map((method) => tabConfigs[method]);
	if (!visibleTabs) return null;

	return (
		<Tabs
			value={activeMethod}
			onValueChange={(value) => onMethodChange(value as UploadMethod)}
			className={cn("w-full", className)}
			defaultValue={visibleTabs[0].value}
		>
			<TabsList
				className="relative h-auto w-full gap-1 bg-neutral-50 dark:bg-neutral-700 p-1 rounded-lg"
				style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}
			>
				{visibleTabs.map((tab) => (
					<TabsTrigger
						key={tab.value}
						value={tab.value}
						disabled={tab.disabled}
						className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=active]:border data-[state=active]:border-slate-200 dark:text-neutral-300 dark:hover:text-neutral-100 rounded-md"
					>
						<span
							className={`hidden md:inline transition-colors duration-200 ${tab.value === activeMethod ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-600 dark:text-neutral-200"}`}
						>
							{tab.icon}
						</span>
						<span className="inline">{tab.label}</span>
						{tab.comingSoon ||
							(tab.disabled && (
								<span className="ml-1 text-xs text-amber-500 font-normal">
									(Soon)
								</span>
							))}
					</TabsTrigger>
				))}
			</TabsList>

			<div className="mt-4">{children}</div>
		</Tabs>
	);
}

interface TabContentWrapperProps {
	readonly value: UploadMethod;
	readonly children: React.ReactNode;
	readonly className?: string;
}

export function TabContentWrapper({
	value,
	children,
	className,
}: TabContentWrapperProps) {
	return (
		<TabsContent
			value={value}
			className={cn(
				"space-y-4 min-h-[280px] bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-slate-200 p-6 shadow-sm",
				className,
			)}
		>
			{children}
		</TabsContent>
	);
}
