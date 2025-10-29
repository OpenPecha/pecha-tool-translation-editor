import { useTranslation } from "react-i18next";
function formatTimeAgo(timestamp) {
	const { t } = useTranslation();
	const time = new Date(timestamp);
	const now = new Date();
	const diffInSeconds = Math.floor((now - time) / 1000);

	if (diffInSeconds < 60)
		return `${t("time.secondsAgo", { count: diffInSeconds })}`;
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60)
		return `${t("time.minutesAgo", { count: diffInMinutes })}`;
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${t("time.hoursAgo", { count: diffInHours })}`;
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 30) return `${t("time.daysAgo", { count: diffInDays })}`;
	const diffInMonths = Math.floor(diffInDays / 30);
	if (diffInMonths < 12)
		return `${t("time.monthsAgo", { count: diffInMonths })}`;
	return `${t("time.yearsAgo", { count: Math.floor(diffInMonths / 12) })}`;
}

export default formatTimeAgo;
