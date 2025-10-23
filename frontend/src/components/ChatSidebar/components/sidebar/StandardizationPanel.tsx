import { useTranslate } from "@tolgee/react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Square,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatInconsistenciesForDisplay } from "@/api/standardize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "../../contexts/TranslationContext";

const StandardizationPanel: React.FC = () => {
  const {
    inconsistentTerms,
    standardizationSelections,
    isAnalyzingStandardization,
    isApplyingStandardization,
    applyStandardizationStatus,
    standardizationStatus,
    setStandardizationSelections: onStandardizationSelectionChange,
    startApplyStandardization: onApplyStandardization,
    stopApplyStandardization: onStopStandardization,
    startStandardizationAnalysis: onRetryInconsistencyAnalysis,
    currentProcessingIndex,
    scrollContainerRef,
  } = useTranslation();

  const variant = "inline";

  const [isCollapsed, setIsCollapsed] = useState(true);
  const standardizationRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useTranslate();
  const setStandardizationSelections = useCallback(
    (updater: (prev: Record<string, string>) => Record<string, string>) => {
      onStandardizationSelectionChange(updater(standardizationSelections));
    },
    [onStandardizationSelectionChange, standardizationSelections]
  );

  // Set default values for first occurrence of each inconsistent term
  useEffect(() => {
    const inconsistencyItems =
      formatInconsistenciesForDisplay(inconsistentTerms);
    const defaultSelections: Record<string, string> = {};

    inconsistencyItems.forEach((item) => {
      if (
        !standardizationSelections[item.sourceTerm] &&
        item.translations.length > 0
      ) {
        defaultSelections[item.sourceTerm] = item.translations[0];
      }
    });

    if (Object.keys(defaultSelections).length > 0) {
      onStandardizationSelectionChange((prev) => ({
        ...prev,
        ...defaultSelections,
      }));
    }
  }, [
    inconsistentTerms,
    standardizationSelections,
    onStandardizationSelectionChange,
  ]);

  // Helper function to scroll within the container instead of the entire page
  const scrollToStandardization = useCallback(() => {
    if (!standardizationRef.current || !scrollContainerRef?.current) return;

    const container = scrollContainerRef.current;
    const element = standardizationRef.current;

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

  // Helper function to scroll to a specific item
  const scrollToItem = useCallback(
    (index: number) => {
      if (!itemRefs.current[index] || !scrollContainerRef?.current) return;

      const container = scrollContainerRef.current;
      const element = itemRefs.current[index];

      // Calculate element position relative to container
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop =
        elementRect.top - containerRect.top + container.scrollTop;

      // Center the item in the container
      const containerHeight = container.clientHeight;
      const elementHeight = element.clientHeight;
      const centerOffset = (containerHeight - elementHeight) / 2;

      container.scrollTo({
        top: Math.max(0, relativeTop - centerOffset),
        behavior: "smooth",
      });
    },
    [scrollContainerRef]
  );

  // Auto-scroll to inconsistency panel when inconsistencies are found
  useEffect(() => {
    const inconsistencyCount = Object.keys(inconsistentTerms).length;
    if (inconsistencyCount > 0) {
      setTimeout(() => {
        scrollToStandardization();
      }, 300); // Small delay to ensure rendering is complete
    }
  }, [inconsistentTerms, scrollToStandardization]);

  // Auto-scroll when expanding to show all content
  useEffect(() => {
    if (!isCollapsed) {
      setTimeout(() => {
        scrollToStandardization();
      }, 200); // Small delay for collapse animation
    }
  }, [isCollapsed, scrollToStandardization]);

  // Auto-collapse and scroll to top when starting standardization
  useEffect(() => {
    if (isApplyingStandardization) {
      setIsCollapsed(true);
      // Scroll to top of container
      if (scrollContainerRef?.current) {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }
  }, [isApplyingStandardization, scrollContainerRef]);

  // Auto-scroll to currently processing item during standardization
  useEffect(() => {
    if (
      currentProcessingIndex !== undefined &&
      currentProcessingIndex >= 0 &&
      itemRefs.current[currentProcessingIndex]
    ) {
      setTimeout(() => {
        scrollToItem(currentProcessingIndex);
      }, 300);
    }
  }, [currentProcessingIndex, scrollToItem]);

  // Success Message - No Inconsistencies
  if (
    !isAnalyzingStandardization &&
    Object.keys(inconsistentTerms).length === 0 &&
    standardizationStatus.includes("No inconsistencies")
  ) {
    return (
      <div className="border-l-4  p-3">
        <div className="text-xs  mt-1">
          {t("standardizationPanel.noInconsistencies")}
        </div>
      </div>
    );
  }

  // No inconsistencies found
  if (Object.keys(inconsistentTerms).length === 0) {
    return null;
  }

  const inconsistencyItems = formatInconsistenciesForDisplay(inconsistentTerms);

  if (variant === "inline") {
    return (
      <div
        ref={standardizationRef}
        className="border-l-4 border-orange-300 bg-orange-50 dark:bg-neutral-600 px-2 py-1 space-y-3"
      >
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800 dark:text-neutral-100">
              {Object.keys(inconsistentTerms).length}{" "}
              {t("standardizationPanel.inconsistentTermsFound")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onRetryInconsistencyAnalysis && (
              <Button
                onClick={onRetryInconsistencyAnalysis}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100 transition-colors"
                title={t("standardizationPanel.reCheckConsistency")}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100"
              title={
                isCollapsed
                  ? t("standardizationPanel.showInconsistentTerms")
                  : t("standardizationPanel.hideInconsistentTerms")
              }
            >
              {isCollapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible content */}
        {!isCollapsed && (
          <>
            {inconsistencyItems.map((item, index) => (
              <div
                key={`${item.sourceTerm}-${index}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="bg-neutral-50 dark:bg-neutral-800 border border-orange-200 dark:border-neutral-300 rounded p-3 space-y-2"
              >
                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {item.sourceTerm}
                </div>

                {/* Input field for standardized translation */}
                <div className="space-y-2">
                  <Input
                    placeholder={t(
                      "standardizationPanel.enterStandardizedTranslation"
                    )}
                    value={standardizationSelections[item.sourceTerm] || ""}
                    onChange={(e) =>
                      setStandardizationSelections((prev) => ({
                        ...prev,
                        [item.sourceTerm]: e.target.value,
                      }))
                    }
                    className="text-sm h-8"
                  />

                  {/* Badge-style options */}
                  <div className="flex flex-wrap gap-1">
                    {item.translations.map((translation, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() =>
                          setStandardizationSelections((prev) => ({
                            ...prev,
                            [item.sourceTerm]: translation,
                          }))
                        }
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          standardizationSelections[item.sourceTerm] ===
                          translation
                            ? "bg-orange-100 dark:bg-neutral-600 border-orange-300 text-orange-700 dark:text-neutral-100"
                            : "bg-gray-100 dark:bg-neutral-600 border-gray-300 text-gray-700 hover:bg-gray-200 dark:text-neutral-300"
                        }`}
                      >
                        {translation}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Apply button */}
            <div className="pt-2 border-t border-orange-200">
              <div className="flex gap-2">
                <Button
                  onClick={onApplyStandardization}
                  disabled={
                    isApplyingStandardization || isAnalyzingStandardization
                  }
                  className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white h-8 text-sm"
                >
                  {isApplyingStandardization ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {t("standardizationPanel.applying")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t("standardizationPanel.applyStandardization")}
                    </>
                  )}
                </Button>
                {isApplyingStandardization && onStopStandardization && (
                  <Button
                    onClick={onStopStandardization}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-orange-600 border-orange-300 hover:bg-orange-100"
                    title={t("standardizationPanel.stopStandardization")}
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Apply Status */}
            {isApplyingStandardization && (
              <div className="text-xs text-secondary-600 bg-secondary-50 border border-secondary-200 rounded p-2">
                {applyStandardizationStatus}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      ref={standardizationRef}
      className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-orange-800">
            {t("standardizationPanel.translationInconsistencies")}
          </h3>
        </div>
        {onRetryInconsistencyAnalysis && (
          <Button
            onClick={onRetryInconsistencyAnalysis}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 transition-colors"
            title={t("standardizationPanel.reCheckConsistency")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
      <p className="text-sm text-orange-600">
        {t(
          "standardizationPanel.chooseStandardizedTranslationsForInconsistentTerms"
        )}
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {inconsistencyItems.map((item, index) => (
          <div
            key={`${item.sourceTerm}-${index}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="bg-white border border-orange-200 rounded-lg p-4 space-y-3"
          >
            <div className="text-base font-medium text-gray-800">
              {item.sourceTerm}
            </div>
            <div className="text-sm text-orange-600 font-medium">
              {t("standardizationPanel.chooseStandardizedTranslation")}
            </div>

            {/* Input field for standardized translation */}
            <div className="space-y-3">
              <Input
                placeholder={t(
                  "standardizationPanel.enterStandardizedTranslation"
                )}
                value={standardizationSelections[item.sourceTerm] || ""}
                onChange={(e) =>
                  setStandardizationSelections((prev) => ({
                    ...prev,
                    [item.sourceTerm]: e.target.value,
                  }))
                }
                className="text-sm"
              />

              {/* Badge-style options */}
              <div className="flex flex-wrap gap-2">
                {item.translations.map((translation, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() =>
                      setStandardizationSelections((prev) => ({
                        ...prev,
                        [item.sourceTerm]: translation,
                      }))
                    }
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      standardizationSelections[item.sourceTerm] === translation
                        ? "bg-orange-100 border-orange-300 text-orange-700 font-medium"
                        : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400"
                    }`}
                  >
                    {translation}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Button */}
      <div className="pt-4 border-t border-orange-200">
        <div className="flex gap-3">
          <Button
            onClick={onApplyStandardization}
            disabled={isApplyingStandardization || isAnalyzingStandardization}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            {isApplyingStandardization ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("standardizationPanel.applyingStandardization")}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("standardizationPanel.applyStandardization")} (
                {Object.keys(inconsistentTerms).length}{" "}
                {t("standardizationPanel.terms")})
              </>
            )}
          </Button>
          {isApplyingStandardization && onStopStandardization && (
            <Button
              onClick={onStopStandardization}
              variant="outline"
              size="lg"
              className="px-3 text-orange-600 border-orange-300 hover:bg-orange-100"
              title={t("standardizationPanel.stopStandardization")}
            >
              <Square className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Apply Status */}
        {isApplyingStandardization && (
          <div className="mt-3 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
            <p className="text-sm text-secondary-800 font-medium">
              {applyStandardizationStatus}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandardizationPanel;
