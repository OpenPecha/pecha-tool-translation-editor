import {
  AlertTriangle,
  BookText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileDown,
  FileText,
  Globe,
  X,
} from "lucide-react";
import type Quill from "quill";
import { useState } from "react";
import { TbReplaceFilled } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEditor } from "@/contexts/EditorContext";
import TranslationResults from "../../TranslationSidebar/components/TranslationResults";
import { useTranslationSidebar } from "../../TranslationSidebar/contexts/TranslationSidebarContext";

interface ResultsPanelProps {
  className?: string;
}

type PanelType = "translation" | "glossary" | "inconsistency";

const ResultsPanel: React.FC<ResultsPanelProps> = ({ className = "" }) => {
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
  } = useTranslationSidebar();
  const { quillEditors } = useEditor();

  const hasTranslationResults = translationResults.length > 0;
  const hasGlossaryResults = glossaryTerms.length > 0;
  const hasInconsistentTerms = Object.keys(inconsistentTerms).length > 0;
  const showPanel =
    hasTranslationResults ||
    hasGlossaryResults ||
    hasInconsistentTerms ||
    isTranslating ||
    isExtractingGlossary ||
    isAnalyzingStandardization;

  if (!showPanel) {
    return null;
  }

  const togglePanel = (panelType: PanelType) => {
    setExpandedPanel(expandedPanel === panelType ? null : panelType);
  };

  const getPanelTitle = (type: PanelType) => {
    switch (type) {
      case "translation": {
        const suffix = hasTranslationResults
          ? ` (${translationResults.length})`
          : "";
        return `Translation Results${suffix}`;
      }
      case "glossary": {
        const suffix = hasGlossaryResults ? ` (${glossaryTerms.length})` : "";
        return `Glossary Terms${suffix}`;
      }
      case "inconsistency": {
        const suffix = hasInconsistentTerms
          ? ` (${Object.keys(inconsistentTerms).length})`
          : "";
        return `Inconsistency Report${suffix}`;
      }
      default:
        return "";
    }
  };

  const shouldShowTranslationPanel = hasTranslationResults || isTranslating;
  const shouldShowGlossaryPanel = hasGlossaryResults || isExtractingGlossary;
  const shouldShowInconsistencyPanel =
    hasInconsistentTerms || isAnalyzingStandardization;

  // Function to apply glossary to translation editor
  const applyGlossaryToEditor = () => {
    // Get the translation editor (the one in the split view)
    const editors = Array.from(quillEditors.entries());
    let translationEditor: [string, Quill] | null = null;

    for (const [id, quill] of editors) {
      const container = quill.root.closest(".editor-container");
      const isTranslationEditor =
        container?.closest(".group\\/translation") ||
        container?.closest(".translation-editor-container");

      if (isTranslationEditor) {
        translationEditor = [id, quill];
        break;
      }
    }

    if (translationEditor?.[1]) {
      const editor = translationEditor[1];

      // Focus the translation editor
      if (typeof editor.focus === "function") {
        editor.focus();
      }

      // Show visual feedback that glossary is ready to be applied
      const container = editor.root?.closest?.(
        ".editor-container"
      ) as HTMLElement;
      if (container) {
        container.style.outline = "2px solid #10b981";
        container.style.outlineOffset = "2px";
        setTimeout(() => {
          container.style.outline = "";
          container.style.outlineOffset = "";
        }, 2000);
      }
    }
  };

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      {/* Translation Results Panel */}
      {shouldShowTranslationPanel && (
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div className="flex items-center justify-between px-1 py-1 bg-blue-50 dark:bg-blue-950/20">
            <Button
              variant="ghost"
              className="flex-1 justify-start font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30"
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

            <div className="flex items-center gap-1">
              {hasTranslationResults && !isTranslating && (
                <Button
                  onClick={overwriteAllResults}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  title="Overwrite all results"
                >
                  <TbReplaceFilled className="w-3 h-3 " />
                </Button>
              )}
              {hasTranslationResults && !isTranslating && (
                <Button
                  onClick={startGlossaryExtraction}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  title="Generate Glossary"
                >
                  <BookText className="w-3 h-3" />
                </Button>
              )}
              {/* Close button for translation */}
              {hasTranslationResults && !isTranslating && (
                <Button
                  onClick={resetTranslations}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                  title="Clear translation results"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {expandedPanel === "translation" && (
            <div className="max-h-80 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                {isTranslating && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Translating...
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
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
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
              {/* Eye button to apply glossary to editor */}
              {hasGlossaryResults &&
                !isExtractingGlossary &&
                !isAnalyzingStandardization && (
                  <Button
                    onClick={applyGlossaryToEditor}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Apply glossary to translation editor"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}

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
            <div className="max-h-80 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-3">
                {isExtractingGlossary && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      Extracting glossary...
                    </div>
                  </div>
                )}

                {isAnalyzingStandardization && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      Analyzing inconsistencies...
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
        <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
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
            <div className="max-h-80 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                                defaultValue={suggestions[0]}
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
                    <Button className="w-full mt-2">
                      Apply Standardization
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
    </div>
  );
};

export default ResultsPanel;
