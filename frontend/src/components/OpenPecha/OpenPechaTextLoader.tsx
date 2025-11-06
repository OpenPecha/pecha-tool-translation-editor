import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { ErrorDisplay } from "@/components/shared/modals";
import { useOpenPecha } from "@/hooks/useOpenPecha";
import { OpenPechaSelector } from "@/components/OpenPecha/OpenPechaSelector";

export function OpenPechaTextLoader({
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
  const queryClient = useQueryClient();

  const {
    selectedTextId,
    setSelectedTextId,
    selectedInstanceId,
    setSelectedInstanceId,
    processedText,
    texts,
    textsLoading,
    textsError,
    instancesLoading,
    instancesError,
    textContentLoading,
    textContentError,
    annotationsLoading,
    annotationsError,
    textOptions,
    instanceOptions,
    extractTitle,
  } = useOpenPecha();

  // Validation state
  const isValid = !!(
    selectedTextId &&
    selectedInstanceId &&
    processedText.trim() &&
    projectName.trim()
  );

  // Notify parent about validation state
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectName) {
        throw new Error("Project name is required");
      }

      if (!processedText.trim()) {
        throw new Error("No text content available");
      }

      // First create the document with the processed text
      const formData = new FormData();
      const selectedText = texts.find(
        (text: any) => text.id === selectedTextId
      );
      const documentName = extractTitle(
        selectedText?.title,
        `OpenPecha-${selectedTextId}`
      );
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "true");
      formData.append("language", selectedText?.language || "tibetan");
      formData.append("content", processedText);
      formData.append(
        "metadata",
        JSON.stringify({
            text_id: selectedTextId,
            instance_id: selectedInstanceId,
          })
      );

      const documentResponse = await createDocumentWithContent(formData);

      if (!documentResponse?.id) {
        throw new Error("Failed to create document");
      }

      // Then create the project with the document as root
      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: documentResponse.id,
        metadata: {
          source: "openpecha",
          text_id: selectedTextId,
          instance_id: selectedInstanceId,
        },
      });
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModal();
      const rootId = data.roots[0].id;
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
    if (!selectedTextId) {
      setError("Please select a text");
      return;
    }
    if (!selectedInstanceId) {
      setError("Please select a instance");
      return;
    }
    setError("");
    createProjectMutation.mutate();
  }, [
    projectName,
    selectedTextId,
    selectedInstanceId,
    createProjectMutation,
  ]);

  // Expose the create function to parent
  React.useEffect(() => {
    if (onCreateProject) {
      (onCreateProject as React.MutableRefObject<(() => void) | null>).current =
        handleCreateProject;
    }
  }, [handleCreateProject, onCreateProject]);

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      <OpenPechaSelector
        selectedTextId={selectedTextId}
        selectedInstanceId={selectedInstanceId}
        processedText={processedText}
        texts={texts}
        textOptions={textOptions}
        instanceOptions={instanceOptions}
        textsLoading={textsLoading}
        instancesLoading={instancesLoading}
        textContentLoading={textContentLoading}
        textsError={textsError as Error | null}
        instancesError={instancesError as Error | null}
        textContentError={textContentError as Error | null}
        annotationsLoading={annotationsLoading}
        annotationsError={annotationsError as Error | null}
        setSelectedTextId={setSelectedTextId}
        setSelectedInstanceId={setSelectedInstanceId}
        extractTitle={extractTitle}
      />
    </div>
  );
}
