import React, { useState } from "react";
import { BaseModal } from "@/components/shared/modals/BaseModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NewPechaForm, PechaFromOpenPecha, EmptyTextForm } from "./Forms";
import { useTranslate } from "@tolgee/react";
import PlusIcon from "@/assets/plus.svg";
import { ChevronLeft, ChevronRight, File, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TbApi } from "react-icons/tb";

export type UploadMethod = "file" | "openpecha" | "empty";

export type AvailableMethodType = {
  type: UploadMethod;
  label: string;
  isDisabled?: boolean;
};

// Helper function for step indicator styling
function getStepIndicatorClass(step: number, currentStep: number): string {
  if (step === currentStep) {
    return "bg-secondary-600 text-white border-secondary-600 shadow-lg dark:shadow-sm shadow-secondary-200";
  } else if (step < currentStep) {
    return "bg-green-600 text-white border-green-600 shadow-lg dark:shadow-sm shadow-green-200";
  } else {
    return "bg-white text-gray-400 border-gray-300";
  }
}

// Step indicator component
function StepIndicator({
  currentStep,
  totalSteps,
}: {
  readonly currentStep: number;
  readonly totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
              getStepIndicatorClass(index + 1, currentStep)
            )}
          >
            {index + 1 < currentStep ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-2 transition-colors duration-300",
                index + 1 < currentStep ? "bg-green-500" : "bg-gray-300"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Method selection component
function MethodSelection({
  selectedMethod,
  onMethodSelect,
  availableMethods,
  onDoubleClick,
}: {
  readonly selectedMethod: UploadMethod | null;
  readonly onMethodSelect: (method: UploadMethod) => void;
  readonly availableMethods: AvailableMethodType[];
  readonly onDoubleClick: () => void;
}) {
  const { t } = useTranslate();

  const methodConfigs = {
    file: {
      icon: <File size={24} />,
      title: t("common.file"),
      description: t("projects.uploadAFileFromYourComputer"),
    },
    openpecha: {
      icon: <TbApi size={24} />,
      title: t("common.openpecha"),
      description: t("projects.importFromOpenPechaRepository"),
    },
    empty: {
      icon: <FileText size={24} />,
      title: t("common.emptyText"),
      description: t("projects.startWithEmptyDocument"),
    },
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-400 mb-2">
          {t(`projects.chooseInputMethod`)}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-500">
          {t(`projects.selectHowYouWantToCreateYourProject`)}
        </p>
      </div>

      <div className="grid gap-4">
        {availableMethods.map((method) => {
          const config = methodConfigs[method.type];
          return (
            <button
              key={method.type}
              disabled={method.isDisabled}
              type="button"
              onClick={() => onMethodSelect(method.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMethodSelect(method.type);
                }
              }}
              onDoubleClick={onDoubleClick}
              className={cn(
                "w-full p-6 border-2 rounded-lg text-left transition-all hover:shadow-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-secondary-500",
                selectedMethod === method.type
                  ? "border-secondary-500 bg-neutral-50 dark:bg-neutral-700"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    selectedMethod === method.type
                      ? "bg-secondary-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {config.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-300 mb-1">
                    {config.title}{" "}
                    {method.isDisabled && (
                      <span className="text-gray-400 text-sm">
                        (Coming Soon)
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-500">
                    {config.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DocumentCreateModal() {
  const [projectName, setProjectName] = useState("");
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(
    null
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const createProjectRef = React.useRef<(() => void) | null>(null);
  const { t } = useTranslate();

  const totalSteps = 3;

  const closeModal = () => {
    setOpen(false);
    setCurrentStep(1);
    setProjectName("");
    setSelectedMethod(null);
    setIsFormValid(false);
    setIsCreating(false);
    createProjectRef.current = null;
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
    { type: "file", label: t("common.file"), isDisabled: false },
    { type: "openpecha", label: t("common.openpecha"), isDisabled: false },
    { type: "empty", label: t("common.emptyText"), isDisabled: false },
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
            <p className="text-sm font-medium text-foreground">Blank</p>
          </div>
        </button>
        <div className="space-y-0.5 px-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {t(`projects.createProject`)}
          </h3>
          <p className="text-xs text-muted-foreground">Start from scratch</p>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-400 mb-2">
                {t(`projects.projectDetails`)}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-500">
                {t(`projects.enterProjectName`)}
              </p>
            </div>
            <div className="space-y-4">
              <Label
                htmlFor="projectName"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
              >
                {t(`projects.projectName`)}
              </Label>
              <Input
                id="projectName"
                value={projectName}
                className="w-full border-gray-300 focus:border-secondary-500 focus:ring-secondary-500"
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t(`projects.enterProjectName`)}
                autoFocus
              />
            </div>
          </div>
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
        if (!selectedMethod) return null;
        return (
          <div className="space-y-6">
            {selectedMethod === "file" && (
              <NewPechaForm
                projectName={projectName}
                closeModal={closeModal}
                onValidationChange={handleValidationChange}
                onCreateProject={createProjectRef}
              />
            )}
            {selectedMethod === "openpecha" && (
              <PechaFromOpenPecha
                projectName={projectName}
                closeModal={closeModal}
                onValidationChange={handleValidationChange}
                onCreateProject={createProjectRef}
              />
            )}
            {selectedMethod === "empty" && (
              <EmptyTextForm
                projectName={projectName}
                closeModal={closeModal}
                onValidationChange={handleValidationChange}
                onCreateProject={createProjectRef}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={t(`projects.createProject`)}
      size="lg"
      variant="fixed"
    >
      <div className="flex flex-col h-full">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <div className="min-h-[400px] pb-6">{renderStepContent()}</div>
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
