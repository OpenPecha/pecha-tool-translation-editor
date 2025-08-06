import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface GlossaryTerm {
  source_term: string;
  translated_term: string;
  frequency?: number;
  context?: string;
}

interface GlossaryDisplayProps {
  glossaryTerms: GlossaryTerm[];
  copiedItems: Set<string>;
  isExtractingGlossary?: boolean;
  onCopyGlossaryTerms: () => void;
  onRetryGlossaryExtraction?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const GlossaryDisplay: React.FC<GlossaryDisplayProps> = ({
  glossaryTerms,
  copiedItems,
  isExtractingGlossary = false,
  onCopyGlossaryTerms,
  onRetryGlossaryExtraction,
  scrollContainerRef,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const glossaryRef = useRef<HTMLDivElement>(null);

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
      className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 space-y-3"
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isExtractingGlossary ? (
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4 text-purple-600" />
          )}
          <span className="text-sm font-medium text-purple-800">
            {isExtractingGlossary
              ? "Extracting Glossary..."
              : "Extracted Glossary"}
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {glossaryTerms.length} terms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRetryGlossaryExtraction && !isExtractingGlossary && (
            <Button
              onClick={onRetryGlossaryExtraction}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100 transition-colors"
              title="Re-extract glossary"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
          {!isExtractingGlossary && (
            <Button
              onClick={onCopyGlossaryTerms}
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 hover:bg-purple-100 transition-colors ${
                copiedItems.has("glossary-copy")
                  ? "bg-green-100 text-green-600"
                  : "text-purple-600"
              }`}
              title={
                copiedItems.has("glossary-copy")
                  ? "Copied!"
                  : "Copy Glossary Terms"
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
              className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100"
              title={
                isCollapsed ? "Show glossary terms" : "Hide glossary terms"
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
              className="bg-white border border-purple-200 rounded-md p-2 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {term.source_term}
                  </div>
                  <div className="text-sm text-gray-600">
                    {term.translated_term}
                  </div>
                  {term.context && (
                    <div className="text-xs text-gray-500 italic mt-1">
                      {term.context}
                    </div>
                  )}
                </div>
                {term.frequency && term.frequency > 1 && (
                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
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
