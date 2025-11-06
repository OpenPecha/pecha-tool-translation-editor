import React, { Suspense } from "react";
import { useDocumentCreateModalContext } from "@/contexts/DocumentCreateModalContext";
import { useTranslation } from "react-i18next";
import { AvailableMethodType } from "./types";

const ProjectNameStep = React.lazy(() =>
  import("./ProjectNameStep").then(module => ({
    default: module.ProjectNameStep
  }))
);
const MethodSelection = React.lazy(() =>
  import("./MethodSelection").then(module => ({
    default: module.MethodSelection
  }))
);
const FormStep = React.lazy(() =>
  import("./FormStep").then(module => ({ default: module.FormStep }))
);

export const StepRenderer = React.memo(() => {
  const {
    state,
    handleNext,
    setProjectName,
    setSelectedMethod,
    setFormValid,
    createProjectRef,
    setNewDocumentId,
    closeOnSuccess
  } = useDocumentCreateModalContext();

  const { t } = useTranslation();

  const availableMethods: AvailableMethodType[] = [
    { type: "empty", label: t("common.emptyText") },
    { type: "file", label: t("common.file") },
    { type: "openpecha", label: t("common.openpecha") }
  ];

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <ProjectNameStep
            projectName={state.projectName}
            setProjectName={setProjectName}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <MethodSelection
            selectedMethod={state.selectedMethod}
            onMethodSelect={setSelectedMethod}
            availableMethods={availableMethods}
            onDoubleClick={handleNext}
          />
        );
      case 3:
        return (
          <FormStep
            selectedMethod={state.selectedMethod}
            projectName={state.projectName}
            closeOnSuccess={closeOnSuccess}
            onValidationChange={setFormValid}
            onCreateProject={createProjectRef}
            setNewDocumentId={setNewDocumentId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[40dvh] pb-6">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-full">
            Loading...
          </div>
        }
      >
        {renderStep()}
      </Suspense>
    </div>
  );
});

StepRenderer.displayName = "StepRenderer";
