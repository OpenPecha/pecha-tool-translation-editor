import React, { useState } from "react";
import { BaseModal } from "@/components/shared/modals/BaseModal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import PlusIcon from "@/assets/plus.svg";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { deleteDocument } from "@/api/document";
import { StepIndicator } from "./StepIndicator";
import { MethodSelection } from "./MethodSelection";
import { ProjectNameStep } from "./ProjectNameStep";
import { FormStep } from "./FormStep";
import { AvailableMethodType, UploadMethod } from "./types";

function DocumentCreateModal() {
  const [projectName, setProjectName] = useState("");
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(
    null
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocumentId, setNewDocumentId] = useState<string | null>(null);
  const createProjectRef = React.useRef<(() => void) | null>(null);
  const { t } = useTranslation();

  const totalSteps = 3;

  const resetModalState = () => {
    setProjectName("");
    setCurrentStep(1);
    setSelectedMethod(null);
    setIsFormValid(false);
    setIsCreating(false);
    createProjectRef.current = null;
    setNewDocumentId(null);
  };

  const closeAndCleanup = async () => {
    if (newDocumentId) {
      try {
        await deleteDocument(newDocumentId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
    setOpen(false);
    resetModalState();
  };

  const closeOnSuccess = () => {
    setOpen(false);
    resetModalState();
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpen(true);
    } else {
      closeAndCleanup();
    }
  };

  const handleOpenModal = () => {
    setOpen(true);
  };

  const handleCreateButtonClick = () => {
    handleOpenModal();
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProject = () => {
    if (createProjectRef.current) {
      setIsCreating(true);
      createProjectRef.current();
    }
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return projectName.trim().length > 0;
      case 2:
        return selectedMethod !== null;
      default:
        return false;
    }
  };

  const availableMethods: AvailableMethodType[] = [
    { type: "empty", label: t("common.emptyText"), isDisabled: false },
    { type: "file", label: t("common.file"), isDisabled: false },
    { type: "openpecha", label: t("common.openpecha"), isDisabled: true },
  ];

  const trigger = (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: "180px" }}
    >
      <div className="space-y-2">
        <button
          type="button"
          className="border-2 bg-white border-dashed border-border hover:border-primary/60 transition-all duration-300 h-[180px] hover:shadow-lg rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-secondary-500"
          onClick={handleCreateButtonClick}
        >
          <div className="p-0 flex flex-col items-center justify-center h-full">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              <img src={PlusIcon} width={50} height={50} alt="Create project" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t(`project.blank`)}
            </p>
          </div>
        </button>
        <div className="space-y-0.5 px-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {t(`projects.createProject`)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(`project.startFromScratch`)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectNameStep
            projectName={projectName}
            setProjectName={setProjectName}
            onNext={handleNext}
          />
        );

      case 2:
        return (
          <MethodSelection
            selectedMethod={selectedMethod}
            onMethodSelect={setSelectedMethod}
            availableMethods={availableMethods}
            onDoubleClick={handleNext}
          />
        );

      case 3:
        return (
          <FormStep
            selectedMethod={selectedMethod}
            projectName={projectName}
            closeOnSuccess={closeOnSuccess}
            onValidationChange={handleValidationChange}
            onCreateProject={createProjectRef}
            setNewDocumentId={setNewDocumentId}
          />
        );

      default:
        return null;
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleModalOpenChange}
      trigger={trigger}
      title={t(`projects.createProject`)}
      size="lg"
      variant="fixed"
    >
      <div className="flex flex-col h-full">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <div className="min-h-[40dvh] pb-6">{renderStepContent()}</div>
        </div>

        {/* Fixed Navigation Footer */}
        <div className="border-t border-neutral-200 bg-neutral-50 dark:bg-neutral-800 px-6 py-4 -mx-6 -mb-6 mt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ChevronLeft size={16} />
              <span>{t(`common.previous`)}</span>
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex items-center space-x-2 bg-secondary-600 hover:bg-secondary-700 hover:dark:bg-secondary-500"
              >
                <span>{t(`common.next`)}</span>
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
      </div>
    </BaseModal>
  );
}

export default DocumentCreateModal;
