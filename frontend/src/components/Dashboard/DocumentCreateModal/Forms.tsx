import React, { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TextUploader from "./TextUploader";
import MetaDataInput from "./MetaDataInput";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { OpenPechaTextLoader } from "./OpenPechaTextLoader";
import { ErrorDisplay, FormSection } from "@/components/shared/modals";
import { DEFAULT_LANGUAGE_SELECTED } from "@/config";
import { useTranslation } from "react-i18next";

export type SelectedPechaType = {
  id: string;
  type: string;
  language: string;
  title: string;
};

export function NewPechaForm({
  projectName,
  closeModal,
  onValidationChange,
  onCreateProject,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}) {
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    DEFAULT_LANGUAGE_SELECTED
  );
  const [rootId, setRootId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
    null
  );
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Notify parent about validation state
  const isValid = !!(rootId && selectedLanguage && selectedLanguage !== "");

  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const createProjectMutation = useMutation({
    mutationFn: () => {
      if (!projectName) {
        throw new Error("Project name is required");
      }
      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: rootId ?? undefined,
        metadata: metadata ?? undefined,
      });
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const rootId = data.roots[0].id;
      closeModal();
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
          />

          {rootId && (
            <FormSection
              title={t("projects.additionalInformation")}
              description={t("projects.ExtraMetadata")}
            >
              <MetaDataInput
                setMetadata={setMetadata}
                disable={
                  !rootId || !selectedLanguage || selectedLanguage === ""
                }
              />
            </FormSection>
          )}
        </>
      )}
    </div>
  );
}

export function PechaFromOpenPecha({
  projectName,
  closeModal,
  onValidationChange,
  onCreateProject,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}) {
  return (
    <OpenPechaTextLoader
      projectName={projectName}
      closeModal={closeModal}
      onValidationChange={onValidationChange}
      onCreateProject={onCreateProject}
    />
  );
}

export function EmptyTextForm({
  projectName,
  closeModal,
  onValidationChange,
  onCreateProject,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}) {
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    DEFAULT_LANGUAGE_SELECTED
  );
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      closeModal();
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
