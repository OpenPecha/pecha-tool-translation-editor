import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle } from "lucide-react";
import { ModalFooter, ErrorDisplay } from "@/components/shared/modals";
import { useTranslation } from "react-i18next";

interface TextPreviewProps {
	file: File;
	fileContent: string;
	language: string;
	onCancel: () => void;
	onSuccess: (translationId: string) => void;
	translationId: string;
}

export function TextPreview({
	fileContent,
	language,
	onCancel,
	onSuccess,
	translationId,
}: TextPreviewProps) {
	const [error, setError] = useState("");
	const { t } = useTranslation();

	const handleConfirm = () => {
		if (!fileContent.trim()) {
			setError("File content is empty");
			return;
		}

		if (!language) {
			setError("Language is required");
			return;
		}

		setError(""); // Clear any previous errors
		onSuccess(translationId);
	};

	return (
		<div className="space-y-6">
			<ErrorDisplay error={error} />

			{/* Content Preview */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium">
						{t("translation.contentPreview")}
					</h3>
					{fileContent.trim() && (
						<div className="flex items-center gap-1 text-green-600">
							<CheckCircle className="h-4 w-4" />
							<span className="text-sm">{t("translation.contentLoaded")}</span>
						</div>
					)}
				</div>

				<Textarea
					value={fileContent}
					rows={12}
					readOnly
					className="font-monlam resize-none border-gray-300 bg-netural-100 dark:bg-netural-800 text-sm leading-relaxed"
					placeholder={t("translation.fileContentWillAppearHere")}
				/>

				{!fileContent.trim() && (
					<div className="flex items-center gap-2 text-amber-600 text-sm">
						<AlertCircle className="h-4 w-4" />
						<span>{t("translation.noContentFoundInTheFile")}</span>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<ModalFooter
				onCancel={onCancel}
				onConfirm={handleConfirm}
				confirmDisabled={!fileContent.trim() || !language}
				confirmText={t("translation.createTranslation")}
				cancelText={t("translation.backToUpload")}
			/>
		</div>
	);
}
