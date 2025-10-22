import { useTranslate } from "@tolgee/react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../../contexts/TranslationContext";

const GlossaryDisplay: React.FC = () => {
  const {
    glossaryTerms,
    copiedItems,
    isExtractingGlossary,
    copyGlossaryTerms,
    startGlossaryAndInconsistencyAnalysis,
    scrollContainerRef,
  } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const glossaryRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslate();
  // Helper function to scroll within the container instead of the entire page
  const scrollToGlossary = useCallback(() => {
    if (!glossaryRef.current || !scrollContainerRef?.current) return;

    const container = scrollContainerRef.current;
    const element = glossaryRef.current;

    // Calculate element position relative to container
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const relativeTop =
      elementRect.top - containerRect.top + container.scrollTop;

    // Scroll within the container with some padding
    container.scrollTo({
      top: Math.max(0, relativeTop - 20), // 20px padding from top
      behavior: "smooth",
    });
  }, [scrollContainerRef]);

  // Auto-expand and scroll to glossary when terms are loaded
  useEffect(() => {
    if (glossaryTerms.length > 0) {
      setIsCollapsed(false); // Auto-expand when terms are loaded
      setTimeout(() => {
        scrollToGlossary();
      }, 300); // Small delay to ensure rendering is complete
    }
  }, [glossaryTerms.length, scrollToGlossary]);

  // Auto-scroll when expanding to show all content
  useEffect(() => {
    if (!isCollapsed) {
      setTimeout(() => {
        scrollToGlossary();
      }, 200); // Small delay for collapse animation
    }
  }, [isCollapsed, scrollToGlossary]);

  // Don't show anything if not loading and no terms
  if (!isExtractingGlossary && glossaryTerms.length === 0) {
    return null;
  }

  // Full variant
  return (
    <div
      ref={glossaryRef}
      className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-300 rounded-lg px-2 py-1 space-y-3"
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isExtractingGlossary ? (
            <Loader2 className="w-4 h-4 text-primary-600 dark:text-primary-200 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-200" />
          )}
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {isExtractingGlossary
              ? t("glossaryDisplay.extractingGlossary")
              : t("glossaryDisplay.extractedGlossary")}
          </span>
          <span className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 px-2 py-1 rounded-full">
            {glossaryTerms.length} {t("glossaryDisplay.terms")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {startGlossaryAndInconsistencyAnalysis && !isExtractingGlossary && (
            <Button
              onClick={startGlossaryAndInconsistencyAnalysis}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-primary-600 dark:text-primary-200 hover:bg-primary-100 transition-colors"
              title={t("glossaryDisplay.reExtractGlossary")}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
          {!isExtractingGlossary && (
            <Button
              onClick={copyGlossaryTerms}
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 hover:bg-primary-100 transition-colors ${
                copiedItems.has("glossary-copy")
                  ? "bg-green-100 text-green-600"
                  : "text-primary-600 dark:text-primary-200"
              }`}
              title={
                copiedItems.has("glossary-copy")
                  ? "Copied!"
                  : t("glossaryDisplay.copyGlossaryTerms")
              }
            >
              {copiedItems.has("glossary-copy") ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
          {!isExtractingGlossary && (
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-primary-600 dark:text-primary-200 hover:bg-primary-100"
              title={
                isCollapsed
                  ? t("glossaryDisplay.showGlossaryTerms")
                  : t("glossaryDisplay.hideGlossaryTerms")
              }
            >
              {isCollapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {glossaryTerms.map((term, index) => (
            <div
              key={`${term.source_term}-${index}`}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-300 rounded-md p-2 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {term.source_term}
                  </div>
                  <div className="text-sm text-neutral-800 dark:text-neutral-100">
                    {term.translated_term}
                  </div>
                  {term.context && (
                    <div className="text-xs text-neutral-800 dark:text-neutral-100 italic mt-1">
                      {term.context}
                    </div>
                  )}
                </div>
                {term.frequency && term.frequency > 1 && (
                  <div className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 px-2 py-1 rounded-full">
                    ×{term.frequency}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlossaryDisplay;
