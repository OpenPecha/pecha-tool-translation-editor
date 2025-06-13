import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDocTranslations, Translation } from "@/hooks/useCurrentDoc";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchTranslationStatus } from "@/api/document";

// Import components
import TranslationList from "./components/TranslationList";

function SelectTranslation({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      enabled: false,
      refetchOnWindowFocus: false, // Don't fetch on mount, we'll control this with the interval
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
      // Refresh both document data and translations
      refetchTranslations();
    }
  }, [translationStatusData, queryClient, rootId, refetchTranslations]);

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-700">
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
