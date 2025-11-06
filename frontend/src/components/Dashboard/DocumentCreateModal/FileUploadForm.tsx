import React, { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TextUploader from "./TextUploader";
import { createProject } from "@/api/project";
import { ErrorDisplay } from "@/components/shared/modals";
import { DEFAULT_LANGUAGE_SELECTED } from "@/config";

interface FileUploadFormProps {
  readonly projectName: string;
  readonly closeOnSuccess: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
  readonly setNewDocumentId: (id: string | null) => void;
}

export function FileUploadForm({
  projectName,
  closeOnSuccess,
  onValidationChange,
  onCreateProject,
  setNewDocumentId,
}: FileUploadFormProps) {
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    DEFAULT_LANGUAGE_SELECTED
  );
  const [rootId, setRootId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Notify parent about validation state
  const isValid = !!(rootId && selectedLanguage && selectedLanguage !== "");

  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  React.useEffect(() => {
    setNewDocumentId(rootId);
  }, [rootId, setNewDocumentId]);

  const createProjectMutation = useMutation({
    mutationFn: () => {
      if (!projectName) {
        throw new Error("Project name is required");
      }
      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: rootId ?? undefined,
      });
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const rootId = data.roots[0].id;
      closeOnSuccess();
      window.location.href = `/documents/${rootId}`;
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create project");
    },
  });

  const handleCreateProject = React.useCallback(() => {
    if (!projectName) {
      setError("Project name is required");
      return;
    }
    setError(""); // Clear any previous errors
    createProjectMutation.mutate();
  }, [projectName, createProjectMutation]);

  // Expose the create function to parent
  React.useEffect(() => {
    if (onCreateProject) {
      // Replace the onCreateProject prop with our handleCreateProject
      (onCreateProject as React.MutableRefObject<(() => void) | null>).current =
        handleCreateProject;
    }
  }, [handleCreateProject, onCreateProject]);

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />
      <SelectLanguage
        setSelectedLanguage={setSelectedLanguage}
        selectedLanguage={selectedLanguage}
      />

      {selectedLanguage && (
        <>
          <TextUploader
            isRoot={true}
            isPublic={false}
            selectedLanguage={selectedLanguage}
            setRootId={setRootId}
            disable={!selectedLanguage || selectedLanguage === ""}
            setNewDocumentId={setNewDocumentId}
          />
        </>
      )}
    </div>
  );
}

