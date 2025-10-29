import { Link } from "react-router-dom";
import OpenPecha from "@/assets/icon.png";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
	const { t } = useTranslation();
	return (
		<div className="bg-neutral-100 dark:bg-neutral-700 p-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
					{t("common.poweredBy")}{" "}
					<a href="https://openpecha.org/" className=" text-secondary-500 ">
						<img src={OpenPecha} alt="OpenPecha" className="w-4 h-4 inline" />{" "}
						OpenPecha
					</a>
				</p>
				<Link
					to="/help"
					className="text-sm flex items-center gap-2 hover:text-secondary-800 hover:underline font-medium transition-colors"
					title={t("common.getHelpAndDocumentation")}
				>
					<HelpCircle className="w-4 h-4" /> {t("common.help")}
				</Link>
			</div>
		</div>
	);
}
