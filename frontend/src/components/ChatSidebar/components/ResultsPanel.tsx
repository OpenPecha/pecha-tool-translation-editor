import {
  AlertTriangle,
  BookText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Globe,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { TbReplaceFilled } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import TranslationResults from "./sidebar/TranslationResults";
import { useTranslation } from "../contexts/TranslationContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation as useTranslationI18next } from "react-i18next";

interface ResultsPanelProps {
  className?: string;
  inputMode: "selection" | "manual";
}

type PanelType = "translation" | "glossary" | "inconsistency" | "standardized";

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  className = "",
  inputMode,
}) => {
  const { t } = useTranslationI18next();
  const [expandedPanel, setExpandedPanel] = useState<PanelType | null>(null);

  const {
    translationResults,
    glossaryTerms,
    inconsistentTerms,
    isTranslating,
    isExtractingGlossary,
    isAnalyzingStandardization,
    copiedItems,
    copyGlossaryTerms,
    startStandardizationAnalysis,
    resetTranslations,
    resetGlossary,
    startGlossaryExtraction,
    overwriteAllResults,
    standardizedTranslationResults,
    startStandardizationTranslation,
    standardizationSelections,
    setStandardizationSelections,
  } = useTranslation();

  useEffect(() => {
    if (isTranslating) {
      setExpandedPanel("translation");
    } else if (isExtractingGlossary) {
      setExpandedPanel("glossary");
    } else if (isAnalyzingStandardization) {
      setExpandedPanel("inconsistency");
    }
  }, [isTranslating, isExtractingGlossary, isAnalyzingStandardization]);

  const hasTranslationResults = translationResults.length > 0;
  const hasGlossaryResults = glossaryTerms.length > 0;
  const hasInconsistentTerms = Object.keys(inconsistentTerms).length > 0;
  const hasStandardizedResults = standardizedTranslationResults.length > 0;
  const showPanel =
    hasTranslationResults ||
    hasGlossaryResults ||
    hasInconsistentTerms ||
    isTranslating ||
    isExtractingGlossary ||
    isAnalyzingStandardization ||
    hasStandardizedResults;

  if (!showPanel) {
    return null;
  }

  const togglePanel = (panelType: PanelType) => {
    setExpandedPanel(expandedPanel === panelType ? null : panelType);
  };

  const getPanelTitle = (type: PanelType) => {
    switch (type) {
      case "translation": {
        return t("translation.translationResultsCount", { count: translationResults.length });
      }
      case "glossary": {
        return t("translation.glossaryTermsCount", { count: glossaryTerms.length });
      }
      case "inconsistency": {
        return t("translation.inconsistencyReportCount", { count: Object.keys(inconsistentTerms).length });
      }
      case "standardized": {
        const suffix = hasStandardizedResults
          ? ` (${standardizedTranslationResults.length})`
          : "";
        return `Standardized Translation${suffix}`;
      }
      default:
        return "";
    }
  };

  const shouldShowTranslationPanel = hasTranslationResults || isTranslating;
  const shouldShowGlossaryPanel = hasGlossaryResults || isExtractingGlossary;
  const shouldShowInconsistencyPanel =
    hasInconsistentTerms || isAnalyzingStandardization;
  const shouldShowStandardizedPanel = hasStandardizedResults;

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      {/* Translation Results Panel */}
      {shouldShowTranslationPanel && (
        <div
          className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
            expandedPanel === "translation"
              ? "flex flex-col flex-1 min-h-0"
              : ""
          }`}
        >
          <div className="flex items-center justify-between px-1 py-1 bg-blue-50 dark:bg-blue-950/20">
            <Button
              variant="ghost"
              className="justify-start font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30"
              onClick={() => togglePanel("translation")}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{getPanelTitle("translation")}</span>
                {isTranslating && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
                {expandedPanel === "translation" ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </div>
            </Button>

            <div className="flex items-center gap-2">
              {hasTranslationResults &&
                !isTranslating &&
                inputMode === "selection" && (
                  <Tooltip delayDuration={5}>
                    <TooltipTrigger>
                      <Button
                        onClick={overwriteAllResults}
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      >
                        <TbReplaceFilled className="w-3 h-3 " />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("translation.overwriteAllResults")}</TooltipContent>
                  </Tooltip>
                )}

              {hasTranslationResults && !isTranslating && (
                <Tooltip delayDuration={5}>
                  <TooltipTrigger>
                    <Button
                      onClick={startGlossaryExtraction}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <BookText className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("translation.generateGlossary")}</TooltipContent>
                </Tooltip>
              )}
              {/* Close button for translation */}
              {hasTranslationResults && !isTranslating && (
                <Tooltip delayDuration={5}>
                  <TooltipTrigger>
                    <Button
                      onClick={resetTranslations}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 text-blue-600 dark:text-blue-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear translation results</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {expandedPanel === "translation" && (
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                {isTranslating && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      {t("translation.translatingStatus")}
                    </div>
                  </div>
                )}
                {expandedPanel === "translation" &&
                  !isTranslating &&
                  translationResults.length === 0 && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                            Translation Failed
                          </p>

                          <p className="text-xs text-red-600 dark:text-red-400">
                            💡 Try selecting a different AI model from settings
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                <TranslationResults />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Glossary Results Panel */}
      {shouldShowGlossaryPanel && (
        <div
          className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
            expandedPanel === "glossary" ? "flex flex-col flex-1 min-h-0" : ""
          }`}
        >
          <div className="flex items-center justify-between px-1 py-1 bg-gray-100 dark:bg-gray-800">
            <Button
              variant="ghost"
              className="flex-1 justify-start font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => togglePanel("glossary")}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <span>{getPanelTitle("glossary")}</span>
                {(isExtractingGlossary || isAnalyzingStandardization) && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
                {expandedPanel === "glossary" ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </div>
            </Button>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Check inconsistency button */}
              {hasGlossaryResults &&
                !isExtractingGlossary &&
                !isAnalyzingStandardization && (
                  <Button
                    onClick={() => {
                      startStandardizationAnalysis();
                      setExpandedPanel("inconsistency");
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    title="Check inconsistencies"
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </Button>
                )}

              {/* Copy button */}
              {hasGlossaryResults &&
                !isExtractingGlossary &&
                !isAnalyzingStandardization && (
                  <Button
                    onClick={copyGlossaryTerms}
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 hover:bg-green-100 dark:hover:bg-green-900/30 ${
                      copiedItems.has("glossary-copy")
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                    title={
                      copiedItems.has("glossary-copy")
                        ? "Copied!"
                        : "Copy glossary terms"
                    }
                  >
                    {copiedItems.has("glossary-copy") ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}

              {/* Close button for glossary */}
              {hasGlossaryResults &&
                !isExtractingGlossary &&
                !isAnalyzingStandardization && (
                  <Button
                    onClick={resetGlossary}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-green-600 dark:text-green-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                    title="Clear glossary results"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
            </div>
          </div>

          {expandedPanel === "glossary" && (
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                {isExtractingGlossary && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      {t("translation.extractingGlossaryStatus")}
                    </div>
                  </div>
                )}

                {isAnalyzingStandardization && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      {t("translation.analyzingForInconsistencies")}
                    </div>
                  </div>
                )}

                {/* Simplified glossary list without nested header */}
                {hasGlossaryResults && (
                  <div className="space-y-2">
                    {glossaryTerms.map((term, index) => (
                      <div
                        key={`${term.source_term}-${index}`}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {term.source_term}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {term.translated_term}
                            </div>
                            {term.context && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                {term.context}
                              </div>
                            )}
                          </div>
                          {term.frequency && term.frequency > 1 && (
                            <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                              ×{term.frequency}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inconsistency Report Panel */}
      {shouldShowInconsistencyPanel && (
        <div
          className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
            expandedPanel === "inconsistency"
              ? "flex flex-col flex-1 min-h-0"
              : ""
          }`}
        >
          <div className="flex items-center justify-between px-1 py-1 bg-orange-50 dark:bg-orange-950/20">
            <Button
              variant="ghost"
              className="flex-1 justify-start font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30"
              onClick={() => togglePanel("inconsistency")}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>{getPanelTitle("inconsistency")}</span>
                {isAnalyzingStandardization && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                )}
                {expandedPanel === "inconsistency" ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </div>
            </Button>
          </div>

          {expandedPanel === "inconsistency" && (
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                {isAnalyzingStandardization && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      Analyzing for inconsistencies...
                    </div>
                  </div>
                )}

                {hasInconsistentTerms && (
                  <div className="space-y-2">
                    {Object.entries(inconsistentTerms).map(([term, data]) => {
                      // Handle both formats: array of strings or InconsistentTermData object
                      const suggestions = Array.isArray(data)
                        ? data
                        : data.suggestions || [];
                      const originalTerm = Array.isArray(data)
                        ? term
                        : data.original || term;
                      const count = Array.isArray(data)
                        ? data.length
                        : data.count || suggestions.length;

                      return (
                        <div
                          key={term}
                          className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {originalTerm}
                              </div>
                              <RadioGroup
                                value={standardizationSelections[term]}
                                onValueChange={(value) => {
                                  setStandardizationSelections((prev) => ({
                                    ...prev,
                                    [term]: value,
                                  }));
                                }}
                                className="mt-2"
                              >
                                {suggestions.map((suggestion) => (
                                  <div
                                    key={suggestion}
                                    className="flex items-center space-x-2"
                                  >
                                    <RadioGroupItem
                                      value={suggestion}
                                      id={`${term}-${suggestion}`}
                                    />
                                    <Label htmlFor={`${term}-${suggestion}`}>
                                      {suggestion}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>
                            <div className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                              ×{count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      className="w-full mt-2"
                      onClick={startStandardizationTranslation}
                    >
                      {t("standardizationPanel.applyStandardization")}
                    </Button>
                  </div>
                )}

                {!isAnalyzingStandardization && !hasInconsistentTerms && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">No inconsistencies found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standardized Translation Panel */}
      {shouldShowStandardizedPanel && (
        <div
          className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
            expandedPanel === "standardized"
              ? "flex flex-col flex-1 min-h-0"
              : ""
          }`}
        >
          <div className="flex items-center justify-between px-1 py-1 bg-purple-50 dark:bg-purple-950/20">
            <Button
              variant="ghost"
              className="flex-1 justify-start font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30"
              onClick={() => togglePanel("standardized")}
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span>{getPanelTitle("standardized")}</span>
                {expandedPanel === "standardized" ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </div>
            </Button>
          </div>

          {expandedPanel === "standardized" && (
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                <TranslationResults
                  results={standardizedTranslationResults}
                  isStandardized
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
