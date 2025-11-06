import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createDocumentWithContent } from "@/api/document";
import { ErrorDisplay } from "@/components/shared/modals";
import { Button } from "@/components/ui/button";
import { QueryObserverResult } from "@tanstack/react-query";
import { useOpenPecha } from "@/hooks/useOpenPecha";
import { OpenPechaSelector } from "@/components/OpenPecha/OpenPechaSelector";

export function OpenPechaTranslationLoader({
  rootId,
  onSuccess,
  refetchTranslations,
}: {
  readonly rootId: string;
  readonly onSuccess: (id: string) => void;
  readonly refetchTranslations: () => Promise<
    QueryObserverResult<unknown, Error>
  >;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  const createTranslationMutation = useMutation({
    mutationFn: async () => {
      if (!processedText.trim()) {
        throw new Error("No text content available");
      }
      if (!selectedTextId) {
        throw new Error("Please select a text");
      }
      if (!selectedInstanceId) {
        throw new Error("Please select a instance");
      }

      const formData = new FormData();
      const selectedText = texts.find(
        (text: any) => text.id === selectedTextId
      );
      const documentName = extractTitle(selectedText?.title);
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "false");
      formData.append("isPublic", "false");
      formData.append("language", selectedText.language);
      formData.append("rootId", rootId);
      formData.append("content", processedText);
      formData.append(
        "metadata",
        JSON.stringify({
            text_id: selectedTextId,
            instance_id: selectedInstanceId,
          })
      );
      return createDocumentWithContent(formData);
    },
    onSuccess: (response) => {
      setIsCreating(false);
      onSuccess(response.id);
      refetchTranslations?.();
      navigate(`/documents/${rootId}?translation=${response.id}`);
    },
    onError: (error: Error) => {
      console.error("Error creating OpenPecha translation:", error);
      setError(error.message || "Failed to create OpenPecha translation");
      setIsCreating(false);
    },
  });

  const handleCreateTranslation = () => {
    if (!selectedTextId) {
      setError("Please select a pecha");
      return;
    }
    if (!selectedInstanceId) {
      setError("Please select a version");
      return;
    }
    if (!processedText.trim()) {
      setError("No text content available");
      return;
    }
    setError("");
    setIsCreating(true);
    createTranslationMutation.mutate();
  };

  const hasValidContent = !!(
    selectedTextId &&
    selectedInstanceId &&
    processedText.trim()
  );

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

      {hasValidContent && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleCreateTranslation}
            disabled={isCreating}
            className="px-8 py-2 bg-secondary-600 hover:bg-secondary-700 text-white transition-colors"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Translation...
              </div>
            ) : (
              "Create Translation from OpenPecha"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
