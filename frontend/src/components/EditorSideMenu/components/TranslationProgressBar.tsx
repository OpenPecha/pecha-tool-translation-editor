import React from "react";
import Progress from "./Progress";
import { Translation } from "../../DocumentWrapper";

interface TranslationStatusData {
  id: string;
  translationStatus: string;
  translationProgress?: number;
}

interface ProgressBarProps {
  translationStatusData?: TranslationStatusData[];
  translation: Translation & {
    translationStatus?: string;
    translationProgress?: number;
  };
}

const TranslationProgressBar: React.FC<ProgressBarProps> = ({
  translationStatusData,
  translation,
}) => {
  // Get status from status endpoint if available, otherwise use translation data
  const statusFromEndpoint = translationStatusData?.length
    ? translationStatusData?.find((d) => d.id === translation.id)
    : null;

  // Determine if the translation is in progress based on status
  const inProgress = statusFromEndpoint
    ? statusFromEndpoint.translationStatus === "progress" ||
      statusFromEndpoint.translationStatus === "started"
    : translation.translationStatus === "progress" ||
      translation.translationStatus === "started";

  // Only show progress bar for in-progress translations
  if (!inProgress) return null;

  // Use status from endpoint if available, otherwise fall back to translation data
  const progressValue = statusFromEndpoint
    ? statusFromEndpoint.translationProgress ?? 0
    : translation.translationProgress ?? 0;

  return (
    <div className="px-2 pb-2">
      <Progress value={progressValue} className="h-1" />
      <div className="text-xs text-gray-500 text-right mt-1">
        {progressValue}%
      </div>
    </div>
  );
};

export default TranslationProgressBar;
