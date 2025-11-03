import React, { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { ErrorDisplay } from "@/components/shared/modals";
import { DEFAULT_LANGUAGE_SELECTED } from "@/config";

interface EmptyTextFormProps {
  readonly projectName: string;
  readonly closeOnSuccess: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}

export function EmptyTextForm({
  projectName,
  closeOnSuccess,
  onValidationChange,
  onCreateProject,
}: EmptyTextFormProps) {
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    DEFAULT_LANGUAGE_SELECTED
  );
  const queryClient = useQueryClient();

  // Valid if language is selected
  const isValid = !!(selectedLanguage && selectedLanguage !== "");

  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectName) throw new Error("Project name is required");

      // Create empty document first with date-based identifier
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const documentData = {
        name: "EmptyText",
        identifier: `empty-text-${timestamp}`,
        isRoot: true,
        language: selectedLanguage,
        content: "",
        metadata: {
          source: "empty",
          createdAt: new Date().toISOString(),
        },
      };

      const documentResponse = await createDocumentWithContent(documentData);
      if (!documentResponse?.id) {
        throw new Error("Failed to create document");
      }

      // Create project with empty document as root
      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: documentResponse.id,
        metadata: {
          source: "empty",
          language: selectedLanguage,
        },
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
    if (!selectedLanguage || selectedLanguage === "") {
      setError("Please select a language");
      return;
    }
    setError("");
    createProjectMutation.mutate();
  }, [projectName, selectedLanguage, createProjectMutation]);

  React.useEffect(() => {
    if (onCreateProject) {
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
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Empty text project will be created with the selected language.
        </p>
      </div>
    </div>
  );
}

