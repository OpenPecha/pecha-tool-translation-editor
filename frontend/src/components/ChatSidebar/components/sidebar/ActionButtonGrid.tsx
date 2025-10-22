import { useTranslate } from "@tolgee/react";
import {
  Languages,
  BookOpen,
  Loader2,
  Play,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../../contexts/TranslationContext";

interface ActionButtonGridProps {
  hasInputText: boolean;
  inputMode?: "selection" | "manual";
  onTranslate: () => void;
  onGlossaryExtract: () => void;
}

const ActionButtonGrid: React.FC<ActionButtonGridProps> = ({
  hasInputText,
  inputMode = "selection",
  onTranslate,
  onGlossaryExtract,
}) => {
  const {
    isTranslating,
    isExtractingGlossary,
    translationResults,
    glossaryTerms,
  } = useTranslation();

  const { t } = useTranslate();

  const isProcessing = isTranslating || isExtractingGlossary;
  const hasTranslationResults = translationResults.length > 0;
  const hasGlossaryResults = glossaryTerms.length > 0;

  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {/* Translation Action Button */}
      <Button
        onClick={onTranslate}
        disabled={!hasInputText || isProcessing}
        className={
          isTranslating
            ? "h-16 flex flex-col items-center justify-center gap-2 relative bg-blue-500 hover:bg-blue-600"
            : hasTranslationResults
            ? "h-16 flex flex-col items-center justify-center gap-2 relative bg-green-500 hover:bg-green-600"
            : "h-16 flex flex-col items-center justify-center gap-2 relative bg-blue-500 hover:bg-blue-600"
        }
        size="lg"
      >
        {isTranslating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">
              {t("translation.translating")}
            </span>
          </>
        ) : hasTranslationResults ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span className="text-xs font-medium">
              {t("translation.retranslate")}
            </span>
          </>
        ) : (
          <>
            <Languages className="w-5 h-5" />
            <span className="text-xs font-medium">
              {t("translation.translate")}
              {inputMode === "manual" && (
                <span className="block text-[10px] opacity-75">
                  Manual Input
                </span>
              )}
            </span>
          </>
        )}

        {/* Status indicator */}
        {hasTranslationResults && !isTranslating && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </Button>

      {/* Glossary Action Button */}
      <Button
        onClick={onGlossaryExtract}
        disabled={!hasInputText || isProcessing}
        variant={hasGlossaryResults ? "default" : "outline"}
        className={
          isExtractingGlossary
            ? "h-16 flex flex-col items-center justify-center gap-2 relative bg-purple-500 hover:bg-purple-600 text-white"
            : hasGlossaryResults
            ? "h-16 flex flex-col items-center justify-center gap-2 relative bg-purple-500 hover:bg-purple-600 text-white"
            : "h-16 flex flex-col items-center justify-center gap-2 relative border-purple-300 text-purple-700 hover:bg-purple-50"
        }
        size="lg"
      >
        {isExtractingGlossary ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Extracting</span>
          </>
        ) : hasGlossaryResults ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Re-extract</span>
          </>
        ) : (
          <>
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-medium">Glossary</span>
          </>
        )}

        {/* Status indicator */}
        {hasGlossaryResults && !isExtractingGlossary && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-white" />
        )}
      </Button>

      {/* Quick Actions Row */}
      {(hasTranslationResults || hasGlossaryResults) && (
        <div className="col-span-2 flex gap-2 mt-2">
          {hasTranslationResults && (
            <Button
              onClick={() => onTranslate()}
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs gap-1 text-blue-600 hover:bg-blue-50"
            >
              <Play className="w-3 h-3" />
              Quick Translate
            </Button>
          )}

          {hasGlossaryResults && (
            <Button
              onClick={() => onGlossaryExtract()}
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs gap-1 text-purple-600 hover:bg-purple-50"
            >
              <Sparkles className="w-3 h-3" />
              Quick Glossary
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionButtonGrid;
