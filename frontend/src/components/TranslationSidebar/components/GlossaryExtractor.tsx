import { useTranslate } from "@tolgee/react"
import { BookOpen, FileText, Loader2, Play, RotateCcw } from "lucide-react"
import type Quill from "quill"
import type React from "react"
import { Button } from "@/components/ui/button"
import { useEditor } from "@/contexts/EditorContext"
import { useTranslationSidebar } from "../contexts/TranslationSidebarContext"
import { extractTextPairs, getContentSummary } from "../utils/textPairing"
import GlossaryDisplay from "./GlossaryDisplay"

const GlossaryExtractor: React.FC = () => {
	const { t } = useTranslate()
	const { quillEditors } = useEditor()
	const {
		isExtractingGlossary,
		glossaryTerms,
		extractGlossaryFromEditors,
		resetGlossary,
		error,
		scrollContainerRef,
	} = useTranslationSidebar()

	// Get the main and translation editors
	const getEditors = () => {
		const editors = Array.from(quillEditors.entries())
		// Try to identify main vs translation editor based on container or ID
		let mainEditor: [string, Quill] | null = null
		let translationEditor: [string, Quill] | null = null

		for (const [id, quill] of editors) {
			const container = quill.root.closest(".editor-container")
			const isTranslationEditor =
				container?.closest(".group\\/translation") ||
				container?.closest(".translation-editor-container")

			if (isTranslationEditor) {
				translationEditor = [id, quill]
			} else {
				mainEditor = [id, quill]
			}
		}

		return { mainEditor, translationEditor }
	}

	const { mainEditor, translationEditor } = getEditors()
	const contentSummary = getContentSummary(
		mainEditor?.[1] || null,
		translationEditor?.[1] || null,
	)

	const handleExtractGlossary = async () => {
		if (!mainEditor?.[1] || !translationEditor?.[1]) {
			return
		}

		const textPairs = extractTextPairs(mainEditor[1], translationEditor[1])
		if (textPairs.length === 0) {
			return
		}

		await extractGlossaryFromEditors(textPairs)
	}

	const canExtract = !contentSummary.isEmpty && !isExtractingGlossary

	return (
		<div className="h-full flex flex-col">
			{/* Header Section */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2 mb-3">
					<BookOpen className="w-5 h-5 text-blue-600" />
					<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
						{t("glossary.extractor")}
					</h2>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{t("glossary.extractorDescription")}
				</p>

				{/* Content Summary */}
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
					<div className="flex items-center gap-2 mb-2">
						<FileText className="w-4 h-4 text-gray-500" />
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							{t("glossary.contentSummary")}
						</span>
					</div>

					{contentSummary.isEmpty ? (
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{!mainEditor?.[1] || !translationEditor?.[1]
								? t("glossary.noEditorsAvailable")
								: t("glossary.noContentAvailable")}
						</p>
					) : (
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("glossary.originalWords")}:
								</span>
								<span className="ml-1 font-medium text-gray-800 dark:text-gray-200">
									{contentSummary.mainWordCount}
								</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("glossary.translatedWords")}:
								</span>
								<span className="ml-1 font-medium text-gray-800 dark:text-gray-200">
									{contentSummary.translationWordCount}
								</span>
							</div>
							<div className="col-span-2">
								<span className="text-gray-600 dark:text-gray-400">
									{t("glossary.textPairs")}:
								</span>
								<span className="ml-1 font-medium text-gray-800 dark:text-gray-200">
									{contentSummary.pairsCount}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<Button
						onClick={handleExtractGlossary}
						disabled={!canExtract}
						className="flex-1 h-10"
					>
						{isExtractingGlossary ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								{t("glossary.extracting")}
							</>
						) : (
							<>
								<Play className="w-4 h-4 mr-2" />
								{t("glossary.extractGlossary")}
							</>
						)}
					</Button>

					{glossaryTerms.length > 0 && (
						<Button
							onClick={resetGlossary}
							variant="outline"
							disabled={isExtractingGlossary}
							className="h-10"
							title={t("glossary.clearResults")}
						>
							<RotateCcw className="w-4 h-4" />
						</Button>
					)}
				</div>

				{/* Error Display */}
				{error && (
					<div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-sm text-red-800 dark:text-red-400">{error}</p>
					</div>
				)}
			</div>

			{/* Results Section */}
			<div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
				{isExtractingGlossary && (
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{t("glossary.analyzingText")}
							</p>
						</div>
					</div>
				)}

				{!isExtractingGlossary && glossaryTerms.length === 0 && !error && (
					<div className="flex items-center justify-center py-8">
						<div className="text-center text-gray-500 dark:text-gray-400">
							<BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p className="text-sm">
								{contentSummary.isEmpty
									? t("glossary.loadBothEditorsMessage")
									: t("glossary.clickExtractToStart")}
							</p>
						</div>
					</div>
				)}

				{/* Glossary Results */}
				{glossaryTerms.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
								{t("glossary.extractedTerms")} ({glossaryTerms.length})
							</h3>
						</div>
						<GlossaryDisplay />
					</div>
				)}
			</div>
		</div>
	)
}

export default GlossaryExtractor
