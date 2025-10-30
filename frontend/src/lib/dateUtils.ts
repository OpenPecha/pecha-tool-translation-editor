export type TimeCategory =
	| "today"
	| "yesterday"
	| "last7Days"
	| "previous30Days"
	| "earlier";

export interface CategorizedProject {
	category: TimeCategory;
	projects: any[];
}

/**
 * Format date based on time category
 */
export function formatDateByCategory(
	date: string,
	category: TimeCategory,
): string {
	const dateObj = new Date(date);

	if (category === "today" || category === "yesterday") {
		// Format as HH:MM for today and yesterday
		return dateObj.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	} else {
		// Format as YYYY-MM-DD for other categories
		return dateObj.toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format
	}
}

/**
 * Get time category for a given date
 */
export function getTimeCategory(date: string): TimeCategory {
	const now = new Date();
	const dateObj = new Date(date);
	const diffInMs = now.getTime() - dateObj.getTime();
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	// Check if it's today
	const isToday = now.toDateString() === dateObj.toDateString();
	if (isToday) return "today";

	// Check if it's yesterday
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = yesterday.toDateString() === dateObj.toDateString();
	if (isYesterday) return "yesterday";

	// Check other categories
	if (diffInDays <= 7) return "last7Days";
	if (diffInDays <= 30) return "previous30Days";
	return "earlier";
}

/**
 * Get category title for display
 */
export function getCategoryTitle(category: TimeCategory): string {
	const categoryTitles = {
		today: "today",
		yesterday: "yesterday",
		last7Days: "last7Days",
		previous30Days: "previous30Days",
		earlier: "earlier",
	};

	return categoryTitles[category] || category;
}

/**
 * Categorize and sort projects by time
 */
export function categorizeProjectsByTime(
	projects: any[],
): CategorizedProject[] {
	const categorized: Record<TimeCategory, any[]> = {
		today: [],
		yesterday: [],
		last7Days: [],
		previous30Days: [],
		earlier: [],
	};

	// Categorize projects
	projects.forEach((project) => {
		const category = getTimeCategory(project.updatedAt);
		categorized[category].push(project);
	});

	// Sort projects within each category by updatedAt (most recent first)
	Object.keys(categorized).forEach((key) => {
		const category = key as TimeCategory;
		categorized[category].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);
	});

	// Return only categories that have projects
	const result: CategorizedProject[] = [];
	const categoryOrder: TimeCategory[] = [
		"today",
		"yesterday",
		"last7Days",
		"previous30Days",
		"earlier",
	];

	categoryOrder.forEach((category) => {
		if (categorized[category].length > 0) {
			result.push({
				category,
				projects: categorized[category],
			});
		}
	});

	return result;
}

/**
 * Get unique owners from projects
 */
export function getUniqueOwners(
	projects: any[],
): Array<{ id: string; username: string }> {
	const ownersMap = new Map();
	projects.forEach((project) => {
		if (project.owner) {
			ownersMap.set(project.owner.id, project.owner);
		}
	});

	return Array.from(ownersMap.values());
}
