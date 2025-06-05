import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDocTranslations, Translation } from "@/hooks/useCurrentDoc";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteDocument,
  fetchTranslationStatus,
  updateDocument,
} from "@/api/document";

// Import components
import TranslationList from "./components/TranslationList";

function SelectTranslation({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingTranslationId, setDeletingTranslationId] = useState<
    string | null
  >(null);
  const { id } = useParams();
  const rootId = id as string;
  const { translations, refetchTranslations } =
    useCurrentDocTranslations(rootId);
  const queryClient = useQueryClient();
  // Set up polling for translation status and progress updates
  const { data: translationStatusData, refetch: refetchTranslationStatus } =
    useQuery({
      queryKey: [`translation-status-${rootId}`],
      queryFn: () => fetchTranslationStatus(rootId),
      enabled: false, // Don't fetch on mount, we'll control this with the interval
    });

  // Set up polling for translation progress updates
  useEffect(() => {
    // Only poll if there are translations in progress and none have failed
    const hasInProgressTranslations = translations.some(
      (translation: Translation) =>
        translation.translationStatus === "progress" ||
        translation.translationStatus === "started" ||
        translation.translationStatus === "pending"
    );

    // Check if any translation has failed
    const hasFailedTranslation = translations.some(
      (translation: Translation) => translation.translationStatus === "failed"
    );

    // Don't poll if there are no in-progress translations or if any translation has failed
    if (!hasInProgressTranslations || hasFailedTranslation) return;

    const intervalId = setInterval(() => {
      // Instead of invalidating the whole document query, just fetch translation status
      refetchTranslationStatus();
    }, 10000);
    // Immediately fetch status when we detect in-progress translations
    refetchTranslationStatus();
    return () => {
      clearInterval(intervalId);
      console.log("cleaned up");
    };
  }, [translations, refetchTranslationStatus, rootId]);

  useEffect(() => {
    // Check if all translations have completed
    const allTranslationsCompleted =
      translationStatusData?.length > 0 &&
      translationStatusData.every(
        (status) =>
          status.translationStatus !== "progress" &&
          status.translationStatus !== "started"
      );
    // If all translations are completed, stop polling and refresh translations
    if (allTranslationsCompleted) {
      console.log("All translations completed, stopping status polling");
      // Refresh both document data and translations
      refetchTranslations();
    }
  }, [translationStatusData, queryClient, rootId, refetchTranslations]);

  const deleteTranslationMutation = useMutation({
    mutationFn: (translationId: string) => deleteDocument(translationId),
    onSuccess: () => {
      // Refresh document data and translations list
      refetchTranslations();
      console.log("Translation deleted successfully");
      // Clear the deleting state
      setDeletingTranslationId(null);
    },
    onError: (error) => {
      console.error("Error deleting translation:", error);
      // Clear the deleting state on error too
      setDeletingTranslationId(null);
      window.alert(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to delete translation"
        }`
      );
    },
  });

  // Set up mutation for updating document title
  const updateTitleMutation = useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      if (!id) throw new Error("Document ID not found");
      // Update the document name instead of the identifier
      return await updateDocument(data.id, { name: data.name });
    },
    onSuccess: () => {
      // Invalidate and refetch document data and translations
      refetchTranslations();
    },
    onError: (error) => {
      console.error("Failed to update document title:", error);
      // Revert to original title on error
    },
  });

  const handleDeleteTranslation = (
    translationId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (window.confirm("Are you sure you want to delete this translation?")) {
      // Set the deleting state before starting the mutation
      setDeletingTranslationId(translationId);
      deleteTranslationMutation.mutate(translationId);
    }
  };

  const handleEditTranslation = (translationId: string, name: string) => {
    // Implement edit functionality here
    updateTitleMutation.mutate({ id: translationId, name });
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-600">
          Translations
        </h3>
        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className="flex items-center gap-1 h-8 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 p-2">
        <TranslationList
          translations={translations}
          translationStatusData={translationStatusData}
          setSelectedTranslationId={setSelectedTranslationId}
          onDeleteTranslation={handleDeleteTranslation}
          onEditTranslation={handleEditTranslation}
          deletingTranslationId={deletingTranslationId}
        />
      </div>

      {showCreateModal && (
        <CreateTranslationModal
          rootId={rootId}
          onClose={() => setShowCreateModal(false)}
          refetchTranslations={refetchTranslations}
        />
      )}
    </div>
  );
}

export default SelectTranslation;
