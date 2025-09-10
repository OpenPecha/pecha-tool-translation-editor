import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquare, X, Loader2 } from "lucide-react";

interface GlossaryChatbotProps {
  onStartGlossaryExtraction: () => void;
  isExtractingGlossary: boolean;
  isAnalyzingStandardization: boolean;
  translationResults: any[];
  disabled?: boolean;
}

const GlossaryChatbot: React.FC<GlossaryChatbotProps> = ({
  onStartGlossaryExtraction,
  isExtractingGlossary,
  isAnalyzingStandardization,
  translationResults,
  disabled = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleYesClick = () => {
    setIsDismissed(true);
    onStartGlossaryExtraction();
  };

  const handleNoClick = () => {
    setIsDismissed(true);
  };

  // If currently processing, show the loading state
  if (isExtractingGlossary || isAnalyzingStandardization) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
          </div>
          <p className="text-xs text-purple-800 leading-relaxed">
            {isExtractingGlossary ? "Extracting glossary terms..." : "Analyzing consistency..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't show anything if dismissed or disabled
  if (isDismissed || disabled || translationResults.length === 0) {
    return null;
  }

  // Show the chatbot asking directly
  return (
    <div className="relative bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-300 rounded-lg p-3 shadow-sm">
      {/* Close button */}
      <button
        onClick={handleNoClick}
        className="absolute top-1 right-1 w-4 h-4 rounded-full hover:bg-white/50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
      
      {/* Chatbot message */}
      <div className="flex items-start gap-2 mb-3">
        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-purple-200">
          <MessageSquare className="w-3 h-3 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-neutral-800 dark:text-neutral-100 leading-relaxed">
            Great! I found <span className="font-medium text-primary-600 dark:text-primary-200">{translationResults.length}</span> translation{translationResults.length > 1 ? 's' : ''}. 
            Would you like me to extract a glossary and check for terminology consistency?
          </p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={handleNoClick}
          variant="outline"
          size="sm"
          className="h-6 px-3 text-xs text-neutral-800 dark:text-neutral-100 border-neutral-300 hover:bg-white"
        >
          Not now
        </Button>
        <Button
          onClick={handleYesClick}
          variant="outline"
          size="sm"
          className="h-6 px-3 text-xs text-primary-600 dark:text-primary-200 border-primary-300 hover:bg-primary-100 bg-white"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Yes, please!
        </Button>
      </div>
    </div>
  );
};

export default GlossaryChatbot;
