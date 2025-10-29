import React from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Settings,
	Globe,
	Languages,
	FileText,
	Bot,
	Hash,
	MessageSquare,
	BookOpen,
	Lightbulb,
} from "lucide-react";

import {
	TARGET_LANGUAGES,
	TEXT_TYPES,
	MODEL_NAMES,
	TargetLanguage,
	TextType,
	ModelName,
} from "@/api/translate";
import { useTranslation } from "react-i18next";

interface TranslationConfig {
	targetLanguage: TargetLanguage;
	textType: TextType;
	modelName: ModelName;
	batchSize: number;
	userRules: string;
	extractGlossary: boolean;
}

interface SettingsModalProps {
	config: TranslationConfig;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfigChange: <K extends keyof TranslationConfig>(
		key: K,
		value: TranslationConfig[K],
	) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
	config,
	isOpen,
	onOpenChange,
	onConfigChange,
}) => {
	const { t } = useTranslation();
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="w-6 h-6 rounded-md"
					title={t("translation.translationSettings")}
				>
					<Settings className="w-3 h-3" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
							<Settings className="w-4 h-4 text-secondary-600" />
						</div>
						<div>
							<DialogTitle className="text-lg font-semibold">
								{t("translation.translationSettings")}
							</DialogTitle>
							<p className="text-sm mt-1">
								{t("translation.configureTranslationPreferences")}
							</p>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Core Settings */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-sm font-medium">
							<Globe className="w-4 h-4" />
							{t("translation.coreSettings")}
						</div>

						<div className="grid grid-cols-2 gap-4">
							{/* Target Language */}
							<div className="space-y-2">
								<Label className="text-sm font-medium flex items-center gap-2">
									<Languages className="w-3 h-3" />
									{t("translation.targetLanguage")}
								</Label>
								<Select
									value={config.targetLanguage}
									onValueChange={(value: TargetLanguage) =>
										onConfigChange("targetLanguage", value)
									}
								>
									<SelectTrigger className="h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TARGET_LANGUAGES.map((lang) => (
											<SelectItem key={lang} value={lang}>
												{lang.charAt(0).toUpperCase() + lang.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Text Type */}
							<div className="space-y-2">
								<Label className="text-sm font-medium flex items-center gap-2">
									<FileText className="w-3 h-3" />
									{t("translation.contentType")}
								</Label>
								<Select
									value={config.textType}
									onValueChange={(value: TextType) =>
										onConfigChange("textType", value)
									}
								>
									<SelectTrigger className="h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEXT_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* AI Settings */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-sm font-medium">
							<Bot className="w-4 h-4" />
							{t("translation.aiConfiguration")}
						</div>

						<div className="grid grid-cols-2 gap-4">
							{/* Model */}
							<div className="space-y-2">
								<Label className="text-sm font-medium flex items-center gap-2">
									<Bot className="w-3 h-3" />
									{t("translation.aiModel")}
								</Label>
								<Select
									value={config.modelName}
									onValueChange={(value: ModelName) =>
										onConfigChange("modelName", value)
									}
								>
									<SelectTrigger className="h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MODEL_NAMES.map((model) => (
											<SelectItem key={model} value={model}>
												{model.toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Batch Size */}
							<div className="space-y-2">
								<Label
									htmlFor="batch-size"
									className="text-sm font-medium flex items-center gap-2"
								>
									<Hash className="w-3 h-3" />
									{t("translation.batchSize")}
								</Label>
								<Input
									id="batch-size"
									type="number"
									min={1}
									max={10}
									value={config.batchSize}
									onChange={(e) =>
										onConfigChange("batchSize", parseInt(e.target.value) || 1)
									}
									className="h-9"
								/>
								<p className="text-xs">
									{t("translation.linesProcessedPerBatch")}
								</p>
							</div>
						</div>
					</div>

					{/* Custom Instructions */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-sm font-medium">
							<MessageSquare className="w-4 h-4" />
							{t("translation.customInstructions")}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="user-rules"
								className="text-sm font-medium flex items-center gap-2"
							>
								<MessageSquare className="w-3 h-3" />
								{t("translation.translationGuidelines")}
							</Label>
							<Textarea
								id="user-rules"
								placeholder="Enter specific instructions for the AI translator (e.g., 'Maintain formal tone', 'Preserve technical terms', etc.)"
								value={config.userRules}
								onChange={(e) => onConfigChange("userRules", e.target.value)}
								className="min-h-[80px] resize-none"
							/>
							<p className="text-xs">
								{t("translation.translationGuidelinesDescription")}
							</p>
						</div>
					</div>

					{/* Glossary Settings */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-sm font-medium">
							<BookOpen className="w-4 h-4" />
							{t("translation.glossaryExtraction")}
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-sm font-medium flex items-center gap-2">
										<Lightbulb className="w-3 h-3" />
										{t("translation.autoExtractGlossary")}
									</Label>
									<p className="text-xs">
										{t(
											"translation.automaticallyExtractKeyTermsAfterTranslation",
										)}
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={config.extractGlossary}
										onChange={(e) =>
											onConfigChange("extractGlossary", e.target.checked)
										}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-600"></div>
								</label>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SettingsModal;
