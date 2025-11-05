import React from "react";
import { FileUploadForm } from "./FileUploadForm";
import { OpenPechaForm } from "./OpenPechaForm";
import { EmptyTextForm } from "./EmptyTextForm";
import { UploadMethod } from "./types";

interface FormStepProps {
  selectedMethod: UploadMethod | null;
  projectName: string;
  closeOnSuccess: () => void;
  onValidationChange: (isValid: boolean) => void;
  onCreateProject: React.MutableRefObject<(() => void) | null>;
  setNewDocumentId: (id: string | null) => void;
}

export const FormStep = React.memo(
  ({
    selectedMethod,
    projectName,
    closeOnSuccess,
    onValidationChange,
    onCreateProject,
    setNewDocumentId
  }: FormStepProps) => {
    if (!selectedMethod) return null;

    return (
      <div className="space-y-6">
        {selectedMethod === "file" && (
          <FileUploadForm
            projectName={projectName}
            closeOnSuccess={closeOnSuccess}
            onValidationChange={onValidationChange}
            onCreateProject={onCreateProject}
            setNewDocumentId={setNewDocumentId}
          />
        )}
        {selectedMethod === "openpecha" && (
          <OpenPechaForm
            projectName={projectName}
            closeOnSuccess={closeOnSuccess}
            onValidationChange={onValidationChange}
            onCreateProject={onCreateProject}
          />
        )}
        {selectedMethod === "empty" && (
          <EmptyTextForm
            projectName={projectName}
            closeOnSuccess={closeOnSuccess}
            onValidationChange={onValidationChange}
            onCreateProject={onCreateProject}
          />
        )}
      </div>
    );
  }
);

FormStep.displayName = "FormStep";
