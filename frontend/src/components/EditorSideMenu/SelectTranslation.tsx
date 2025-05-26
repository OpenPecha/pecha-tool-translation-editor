import { useMemo, useState, useEffect } from "react";
import { GrDocument } from "react-icons/gr";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Translation } from "../DocumentWrapper";
import { Button } from "../ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { deleteDocument, fetchTranslationStatus } from "@/api/document";
import formatTimeAgo from "@/lib/formatTimeAgo";

// Simple progress component
const Progress = ({
  value = 0,
  className = "",
}: {
  value?: number;
  className?: string;
}) => (
  <div
    className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}
  >
    <div
      className="h-full bg-blue-500 transition-all"
      style={{ width: `${value ?? 0}%` }}
    />
  </div>
);

function SelectTranslation({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { id } = useParams();
  const rootId = id as string;
  const { currentDoc } = useCurrentDoc(rootId);
  const queryClient = useQueryClient();
  const translations = useMemo(
    () => currentDoc?.translations ?? [],
    [currentDoc?.translations]
  );

  // Check if the current document is a root document
  const isRoot = Boolean(
    currentDoc && "isRoot" in currentDoc ? currentDoc.isRoot : false
  );

  // Set up polling for translation status and progress updates
  const { data: translationStatusData, refetch: refetchTranslationStatus } =
    useQuery({
      queryKey: [`translation-status-${rootId}`],
      queryFn: () => fetchTranslationStatus(rootId),
      enabled: false, // Don't fetch on mount, we'll control this with the interval
    });
  // Set up polling for translation progress updates
  useEffect(() => {
    // Only poll if there are translations in progress
    const hasInProgressTranslations = translations.some(
      (translation) =>
        translation.translationStatus === "progress" ||
        translation.translationStatus === "started"
    );

    if (!hasInProgressTranslations) return;

    const intervalId = setInterval(() => {
      // Instead of invalidating the whole document query, just fetch translation status
      refetchTranslationStatus();
    }, 10000);
    // Immediately fetch status when we detect in-progress translations
    refetchTranslationStatus();
    return () => clearInterval(intervalId);
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
    // If all translations are completed, stop polling
    if (allTranslationsCompleted) {
      console.log("All translations completed, stopping status polling");
      queryClient.invalidateQueries({ queryKey: [`document-${rootId}`] });
    }
  }, [translationStatusData]);

  const deleteTranslationMutation = useMutation({
    mutationFn: (translationId: string) => deleteDocument(translationId),
    onSuccess: () => {
      // Refresh document data to update the translations list
      queryClient.invalidateQueries({ queryKey: [`document-${rootId}`] });
      console.log("Translation deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting translation:", error);
      window.alert(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to delete translation"
        }`
      );
    },
  });

  const handleDeleteTranslation = (
    translationId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (window.confirm("Are you sure you want to delete this translation?")) {
      deleteTranslationMutation.mutate(translationId);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden ">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-600">
          Translations
        </h3>
        {isRoot && (
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="flex items-center gap-1 h-8 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 p-2">
        {translations.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No translations available
          </p>
        ) : (
          translations.map(
            (
              translation: Translation & {
                translationStatus?: string;
                translationProgress?: number;
              }
            ) => {
              const disabled =
                translation.translationStatus === "progress" ||
                translation.translationStatus === "started";
              return (
                <div key={translation.id} className="flex flex-col w-full">
                  <div className="flex items-center w-full">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        // Only allow selection if translation is completed
                        if (!disabled) {
                          setSelectedTranslationId(translation.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          (e.key === "Enter" &&
                            !translation.translationStatus) ||
                          (e.key === "Enter" &&
                            translation.translationStatus === "completed")
                        ) {
                          setSelectedTranslationId(translation.id);
                        }
                      }}
                      className={`flex flex-1 items-center gap-2 p-2 rounded-md w-full text-left flex-grow ${
                        disabled
                          ? "opacity-70 cursor-not-allowed bg-gray-50"
                          : "cursor-pointer hover:bg-gray-100"
                      }`}
                      aria-label={`Open translation ${translation.id}`}
                      aria-disabled={disabled}
                    >
                      <div className="relative flex items-center">
                        <GrDocument
                          size={24}
                          color={
                            !translation.translationStatus ||
                            translation.translationStatus === "completed"
                              ? "#d1d5db"
                              : "lightblue"
                          }
                          className="flex-shrink-0"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-600 capitalize">
                          {translation.language}
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between gap-2">
                          <div className="truncate">{translation.name}</div>
                        </div>
                        <div className="text-xs text-gray-500 capitalize flex items-center">
                          {disabled ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              {translation.translationStatus === "pending"
                                ? "Waiting..."
                                : "Translating..."}
                            </>
                          ) : (
                            formatTimeAgo(translation.updatedAt)
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={(e) =>
                          handleDeleteTranslation(translation.id, e)
                        }
                        disabled={deleteTranslationMutation.isPending}
                        aria-label={`Delete translation ${translation.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar for translations in progress */}
                  <ProgressBar
                    translationStatusData={translationStatusData}
                    translation={translation}
                  />
                </div>
              );
            }
          )
        )}
      </div>

      {showCreateModal && (
        <CreateTranslationModal
          rootId={rootId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

const ProgressBar = ({ translationStatusData, translation }) => {
  // Get status from status endpoint if available, otherwise use translation data
  const statusFromEndpoint = translationStatusData?.length
    ? translationStatusData?.find((d) => d.id === translation.id)
    : null;

  // Determine if the translation is in progress based on status
  const inProgress = statusFromEndpoint
    ? statusFromEndpoint.translationStatus === "progress" ||
      statusFromEndpoint.translationStatus === "started"
    : translation.translationStatus === "progress" ||
      translation.translationStatus === "started";

  // Only show progress bar for in-progress translations
  if (!inProgress) return null;

  // Use status from endpoint if available, otherwise fall back to translation data
  const progressValue = statusFromEndpoint
    ? statusFromEndpoint.translationProgress ?? 0
    : translation.translationProgress ?? 0;

  return (
    <div className="px-2 pb-2">
      <Progress value={progressValue} className="h-1" />
      <div className="text-xs text-gray-500 text-right mt-1">
        {progressValue}%
      </div>
    </div>
  );
};

export default SelectTranslation;
