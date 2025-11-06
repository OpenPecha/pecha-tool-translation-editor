import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentCreateModalContext } from "@/contexts/DocumentCreateModalContext";

export const ModalNavigation = React.memo(() => {
  const { t } = useTranslation();
  const {
    state,
    totalSteps,
    handlePrevious,
    handleNext,
    canGoNext,
    handleCreateProject
  } = useDocumentCreateModalContext();
  const { currentStep, isFormValid, isCreating } = state;

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 dark:bg-neutral-800 px-6 py-4 -mx-6 -mb-6 mt-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center space-x-2"
        >
          <ChevronLeft size={16} />
          <span>{t("common.previous")}</span>
        </Button>

        {currentStep < totalSteps ? (
          <Button
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex items-center space-x-2 bg-secondary-600 hover:bg-secondary-700 hover:dark:bg-secondary-500"
          >
            <span>{t("common.next")}</span>
            <ChevronRight size={16} />
          </Button>
        ) : (
          <Button
            onClick={handleCreateProject}
            disabled={!isFormValid || isCreating}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t("common.creating")}</span>
              </>
            ) : (
              <span>{t("modal.createProject")}</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

ModalNavigation.displayName = "ModalNavigation";
