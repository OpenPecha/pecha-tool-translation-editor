import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Square, Languages, Trash2, ChevronRight } from "lucide-react";

// Import components
import GlossaryDisplay from "./components/GlossaryDisplay";
import TranslationResults from "./components/TranslationResults";
import SettingsModal from "./components/SettingsModal";
import StandardizationPanel from "./components/StandardizationPanel";
import TranslationControls from "./components/TranslationControls";

// Import the master hook
import { useTranslationSidebarOperations } from "./hooks/useTranslationSidebarOperations";
import { useTranslate } from "@tolgee/react";

const TranslationSidebar: React.FC<{ documentId: string }> = ({
	documentId,
}) => {
	// Use the master hook for all operations
	const {
		config,
		handleConfigChange,
		isSidebarCollapsed,
		setIsSidebarCollapsed,
		selectedText,
		activeSelectedEditor,
		selectedTextLineNumbers,
		isTranslating,
		translationResults,
		currentStatus,
		error,
		progressPercent,
		editedTexts,
		editingId,
		editedText,
		expandedItems,
		copiedItems,
		glossaryTerms,
		isExtractingGlossary,
		inconsistentTerms,
		isAnalyzingStandardization,
		standardizationStatus,
		isApplyingStandardization,
		applyStandardizationStatus,
		standardizationSelections,
		currentProcessingIndex,
		standardizationProgress,
		translationListRef,
		scrollContainerRef,
		startTranslation,
		stopTranslation,
		resetTranslations,
		startEditing,
		cancelEditing,
		saveEdit,
		resetToOriginal,
		toggleItemExpansion,
		setEditedText,
		copyResult,
		copyAllResults,
		overwriteAllResults,
		insertSingleResult,
		copyGlossaryTerms,
		startGlossaryAndInconsistencyAnalysis,
		startStandardizationAnalysis,
		startApplyStandardization,
		stopApplyStandardization,
		setStandardizationSelections,
		setError,
	} = useTranslationSidebarOperations({ documentId });

	// Local state for settings modal
	const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
	const { t } = useTranslate();
	return (
		<div
			data-translation-sidebar
			className={`h-full flex bg-neutral-50 dark:bg-neutral-800 transition-all duration-300 ease-in-out ${
				isSidebarCollapsed ? "w-12" : "w-96"
			}`}
		>
			{/* Main Translation Panel */}
			<div className="flex-1 flex flex-col border-l border-gray-200  overflow-hidden">
				{/* Collapsed State - Toggle Button Only */}
				{isSidebarCollapsed ? (
					<div className="h-full  flex-col items-center justify-start pt-4 px-1">
						<Button
							onClick={() => setIsSidebarCollapsed(false)}
							variant="ghost"
							size="icon"
							className={`w-10 h-10 rounded-md hover:bg-gray-100 relative ${
								selectedText ? "ring-2 ring-green-200" : ""
							}`}
							title={`Open Translation Panel${
								selectedText ? " (Text Selected)" : ""
							}`}
						>
							<Languages className="w-5 h-5" />
							{selectedText && (
								<div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" />
							)}
						</Button>

						<div
							className="mt-4"
							style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
						>
							<span className="text-xs font-medium">
								{t("translation.translate")}
							</span>
						</div>

						{isTranslating && (
							<div className="mt-4 flex flex-col items-center space-y-2">
								<Loader2 className="w-4 h-4 text-secondary-500 animate-spin" />
								<div className="w-1 bg-secondary-200 rounded-full overflow-hidden">
									<div
										className="w-1 bg-secondary-500 rounded-full transition-all duration-300"
										style={{ height: `${Math.max(progressPercent, 5)}px` }}
									/>
								</div>
							</div>
						)}

						{translationResults.length > 0 && !isTranslating && (
							<div className="mt-4">
								<div
									className="w-2 h-2 bg-green-500 rounded-full"
									title={`${translationResults.length} translation(s) complete`}
								/>
							</div>
						)}
					</div>
				) : (
					/* Expanded State - Chat-like Interface */
					<>
						{/* Header */}
						<div className="flex items-center justify-between p-3 border-b border-gray-200">
							<Button
								onClick={() => setIsSidebarCollapsed(true)}
								variant="ghost"
								size="icon"
								className="w-6 h-6 rounded-md hover:bg-gray-100"
								title={t("translation.collapseTranslationPanel")}
							>
								<ChevronRight className="w-3 h-3 text-neutral-800 dark:text-neutral-100" />
							</Button>

							<h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
								{t("translation.translation")}
							</h3>

							<div className="flex items-center gap-1">
								{translationResults.length > 0 && (
									<Button
										onClick={resetTranslations}
										variant="ghost"
										size="icon"
										className="w-6 h-6 rounded-md hover:bg-neutral-100 hover:text-red-600"
										title={t("translation.clearTranslationResults")}
									>
										<Trash2 className="w-3 h-3" />
									</Button>
								)}

								<SettingsModal
									config={config}
									isOpen={isSettingsModalOpen}
									onOpenChange={setIsSettingsModalOpen}
									onConfigChange={handleConfigChange}
								/>
							</div>
						</div>

						{/* Conversation Area */}
						<div className="flex-1 flex flex-col min-h-0">
							<div
								ref={scrollContainerRef}
								className="flex-1 overflow-y-auto p-3 space-y-3"
							>
								{/* Error Display */}
								{error && (
									<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
										<div className="flex items-start gap-2">
											<div className="w-4 h-4 text-red-400 mt-0.5">
												<svg fill="currentColor" viewBox="0 0 20 20">
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
														clipRule="evenodd"
													/>
												</svg>
											</div>
											<div className="flex-1">
												<p className="text-sm text-red-800 font-medium">
													{t("common.error")}
												</p>
												<p className="text-sm text-red-600 mt-1">{error}</p>
												<div className="flex gap-2 mt-2">
													<Button
														onClick={() => {
															setError(null);
															startTranslation();
														}}
														variant="outline"
														size="sm"
														className="h-6 text-xs text-red-700 border-red-300 hover:bg-red-50"
													>
														{t("translation.retry")}
													</Button>
													<Button
														onClick={() => setError(null)}
														variant="ghost"
														size="sm"
														className="h-6 text-xs text-red-600"
													>
														{t("translation.dismiss")}
													</Button>
												</div>
											</div>
										</div>
									</div>
								)}

								{/* Translation Results */}
								<div ref={translationListRef}>
									<TranslationResults
										translationResults={translationResults}
										copiedItems={copiedItems}
										expandedItems={expandedItems}
										editedTexts={editedTexts}
										editingId={editingId}
										editedText={editedText}
										onCopyResult={copyResult}
										onToggleItemExpansion={toggleItemExpansion}
										onInsertResult={insertSingleResult}
										onStartEditing={startEditing}
										onCancelEditing={cancelEditing}
										onSaveEdit={saveEdit}
										onEditTextChange={setEditedText}
										onResetToOriginal={resetToOriginal}
									/>
								</div>

								{/* Translation Progress - Bottom */}
								{isTranslating && (
									<div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-300 rounded-lg p-3 space-y-2 mt-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Loader2 className="w-4 h-4 text-secondary-600 animate-spin" />
												<span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
													{t("translation.translating")}
												</span>
											</div>
											<Button
												onClick={stopTranslation}
												variant="outline"
												size="sm"
												className="h-6 w-6 p-0 text-secondary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
											>
												<Square className="w-3 h-3" />
											</Button>
										</div>
										<div className="space-y-1">
											<div className="w-full bg-secondary-200 dark:bg-neutral-800 rounded-full h-2">
												<div
													className="bg-secondary-600 h-2 rounded-full transition-all duration-300 ease-out"
													style={{ width: `${progressPercent}%` }}
												></div>
											</div>
											<p className="text-xs text-secondary-600 dark:text-neutral-100">
												{currentStatus}
											</p>
										</div>
									</div>
								)}

								{/* Glossary Terms Display - Full variant */}
								<GlossaryDisplay
									glossaryTerms={glossaryTerms}
									copiedItems={copiedItems}
									isExtractingGlossary={isExtractingGlossary}
									onCopyGlossaryTerms={copyGlossaryTerms}
									onRetryGlossaryExtraction={
										startGlossaryAndInconsistencyAnalysis
									}
									scrollContainerRef={scrollContainerRef}
								/>
								<StandardizationPanel
									inconsistentTerms={inconsistentTerms}
									standardizationSelections={standardizationSelections}
									isAnalyzingStandardization={isAnalyzingStandardization}
									isApplyingStandardization={isApplyingStandardization}
									applyStandardizationStatus={applyStandardizationStatus}
									standardizationStatus={standardizationStatus}
									onStandardizationSelectionChange={
										setStandardizationSelections
									}
									onApplyStandardization={startApplyStandardization}
									onStopStandardization={stopApplyStandardization}
									onRetryInconsistencyAnalysis={startStandardizationAnalysis}
									variant="inline"
									currentProcessingIndex={currentProcessingIndex}
									scrollContainerRef={scrollContainerRef}
								/>
								{/* Empty State */}
								{!isTranslating &&
									translationResults.length === 0 &&
									!error && (
										<div className="flex-1 flex items-center justify-center text-neutral-400 dark:text-neutral-400">
											<div className="text-center">
												<Languages className="w-8 h-8 mx-auto mb-2 opacity-50" />
												<p className="text-sm">
													{t("translation.selectTextToTranslate")}
												</p>
											</div>
										</div>
									)}
							</div>

							{/* Input Area at Bottom */}
							<TranslationControls
								selectedText={selectedText}
								activeSelectedEditor={activeSelectedEditor}
								selectedTextLineNumbers={selectedTextLineNumbers}
								translationResults={translationResults}
								isTranslating={isTranslating}
								isExtractingGlossary={isExtractingGlossary}
								isAnalyzingStandardization={isAnalyzingStandardization}
								isApplyingStandardization={isApplyingStandardization}
								standardizationProgress={standardizationProgress}
								applyStandardizationStatus={applyStandardizationStatus}
								copiedItems={copiedItems}
								glossaryTerms={glossaryTerms}
								inconsistentTerms={inconsistentTerms}
								onStartTranslation={startTranslation}
								onCopyAllResults={copyAllResults}
								onOverwriteAllResults={overwriteAllResults}
								onStartGlossaryAndInconsistencyAnalysis={
									startGlossaryAndInconsistencyAnalysis
								}
								onStartStandardizationAnalysis={startStandardizationAnalysis}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default TranslationSidebar;
