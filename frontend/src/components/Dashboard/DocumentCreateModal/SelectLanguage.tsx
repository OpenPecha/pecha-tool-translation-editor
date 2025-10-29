import { memo, useCallback } from "react";
import { languages } from "@/utils/Constants";
import { useTranslation } from "react-i18next";
import { SearchableDropdown } from "./SearchableDropdown";

function SelectLanguage({
	selectedLanguage,
	setSelectedLanguage,
}: {
	readonly selectedLanguage: string;
	readonly setSelectedLanguage: (language: string) => void;
}) {
	const { t } = useTranslation();
	const handleChange = useCallback(
		(value: string) => {
			setSelectedLanguage(value);
		},
		[setSelectedLanguage],
	);

	const languageOptions = languages.map((language) => ({
		value: language.code,
		label: language.name,
	}));

	return (
		<div className="space-y-2">
			<SearchableDropdown
				label={t("common.language")}
				placeholder="Select a language..."
				options={languageOptions}
				value={selectedLanguage}
				onChange={handleChange}
				loading={false}
				error={""}
			/>
		</div>
	);
}

export default memo(SelectLanguage);
