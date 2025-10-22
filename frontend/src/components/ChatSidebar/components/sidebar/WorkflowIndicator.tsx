import { useTranslate } from "@tolgee/react";
import {
  Languages,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Clock,
} from "lucide-react";
import type React from "react";

interface WorkflowIndicatorProps {
  isTranslating: boolean;
  isExtractingGlossary: boolean;
  isAnalyzingStandardization: boolean;
  isApplyingStandardization: boolean;
  hasTranslationResults: boolean;
  hasGlossaryResults: boolean;
  hasInconsistentTerms: boolean;
  currentStatus?: string;
  progressPercent?: number;
}

const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({
  isTranslating,
  isExtractingGlossary,
  isAnalyzingStandardization,
  isApplyingStandardization,
  hasTranslationResults,
  hasGlossaryResults,
  hasInconsistentTerms,
  currentStatus,
  progressPercent = 0,
}) => {
  const { t } = useTranslate();

  const steps = [
    {
      id: "translation",
      label: t("translation.translation"),
      icon: Languages,
      isActive: isTranslating,
      isCompleted: hasTranslationResults,
      status: isTranslating
        ? currentStatus
        : hasTranslationResults
        ? "Complete"
        : "Pending",
    },
    {
      id: "glossary",
      label: "Glossary",
      icon: BookOpen,
      isActive: isExtractingGlossary,
      isCompleted: hasGlossaryResults,
      status: isExtractingGlossary
        ? "Extracting terms..."
        : hasGlossaryResults
        ? "Complete"
        : "Pending",
    },
    {
      id: "standardization",
      label: "Standardization",
      icon: AlertTriangle,
      isActive: isAnalyzingStandardization || isApplyingStandardization,
      isCompleted: hasInconsistentTerms,
      status: (() => {
        if (isAnalyzingStandardization) return "Analyzing...";
        if (isApplyingStandardization) return "Applying fixes...";
        if (hasInconsistentTerms) return "Issues found";
        return "Pending";
      })(),
      isOptional: true,
    },
  ];

  const activeStep = steps.find((step) => step.isActive);
  const completedSteps = steps.filter((step) => step.isCompleted).length;

  // Don't show if no activity
  if (!activeStep && completedSteps === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
      <div className="space-y-3">
        {/* Progress Overview */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Workflow Progress
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {completedSteps}/{steps.filter((s) => !s.isOptional).length} steps
          </span>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={(() => {
                      if (step.isActive)
                        return "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all bg-blue-500 border-blue-500 text-white";
                      if (step.isCompleted)
                        return "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all bg-green-500 border-green-500 text-white";
                      return "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400";
                    })()}
                  >
                    {step.isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : step.isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  <span
                    className={(() => {
                      if (step.isActive)
                        return "text-xs mt-1 text-center max-w-16 leading-tight text-blue-600 dark:text-blue-400 font-medium";
                      if (step.isCompleted)
                        return "text-xs mt-1 text-center max-w-16 leading-tight text-green-600 dark:text-green-400";
                      return "text-xs mt-1 text-center max-w-16 leading-tight text-gray-500 dark:text-gray-400";
                    })()}
                  >
                    {step.label}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={
                      step.isCompleted
                        ? "w-8 h-0.5 mx-1 transition-all bg-green-300 dark:bg-green-600"
                        : "w-8 h-0.5 mx-1 transition-all bg-gray-300 dark:bg-gray-600"
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Active Step Details */}
        {activeStep && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {activeStep.label}
              </span>
            </div>

            {activeStep.status && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {activeStep.status}
              </p>
            )}

            {(isTranslating || isApplyingStandardization) &&
              progressPercent > 0 && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{progressPercent}%</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      In progress...
                    </span>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowIndicator;
