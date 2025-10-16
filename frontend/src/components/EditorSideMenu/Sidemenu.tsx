import React, { useState } from "react";
import { Languages } from "lucide-react";
import SelectTranslation from "./SelectTranslation";
import { Button } from "@/components/ui/button";
import { IoIosArrowForward } from "react-icons/io";
import { cn } from "@/lib/utils";

type MenuOption =
	| "translations"
	| "main"
	| "comments"
	| "commentary"
	| "footnotes";

function SideMenu() {
	const [currentView, setCurrentView] = useState<MenuOption>("main");
	const reset = () => {
		setCurrentView("main");
	};

	const renderContent = () => {
		switch (currentView) {
			case "translations":
				return (
					<InMenuWrapper onBackClick={reset}>
						<SelectTranslation />
					</InMenuWrapper>
				);

			default:
				return (
					<div className="flex flex-col p-4 gap-3 ">
						<MenuButton
							onClick={() => setCurrentView("translations")}
							title="translations"
						>
							<Languages
								size={16}
								className="text-neutral-800 dark:text-neutral-100"
							/>
						</MenuButton>
					</div>
				);
		}
	};

	return (
		<div
			style={{
				width: currentView === "main" ? "" : "calc(var(--spacing) * 84)",
			}}
		>
			{renderContent()}
		</div>
	);
}

function MenuButton({
	children,
	onClick,
	title,
}: {
	readonly children: React.ReactNode;
	readonly onClick: () => void;
	readonly title: string;
}) {
	return (
		<Button
			type="button"
			onClick={onClick}
			variant="outline"
			title={title}
			className="text-left py-2 px-4 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors flex items-center justify-between"
		>
			{children}
		</Button>
	);
}

function InMenuWrapper({
	children,
	onBackClick,
}: {
	readonly children: React.ReactNode;
	readonly onBackClick: () => void;
}) {
	return (
		<div className="h-full flex group relative w-full">
			{/* Line container */}
			<div className="relative h-full">
				{/* Vertical Line (hidden by default, shows on hover except on mobile) */}
				<div
					className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 
          opacity-100 
          sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover/content:opacity-100
          transition-opacity duration-200"
				/>

				{/* Arrow (always visible on mobile, only on hover on desktop) */}
				<div
					className={cn(
						"absolute bg-white border rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer text-gray-700 text-xl z-10",
						"opacity-100", // always visible on mobile
						"sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover/content:opacity-100", // only on hover for sm and up, shows on gutter OR content hover
						"transition-opacity duration-200",
					)}
					onClick={onBackClick}
				>
					<IoIosArrowForward />
				</div>
			</div>

			{/* Content area */}
			<div className="group/content p-4 w-full">{children}</div>
		</div>
	);
}

export default SideMenu;
