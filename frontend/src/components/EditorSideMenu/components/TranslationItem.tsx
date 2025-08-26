import React from "react";
import { GrDocument } from "react-icons/gr";
import { Trash2 } from "lucide-react";
import { Translation } from "../../DocumentWrapper";
import TranslationMenu from "./TranslationMenu";

import formatTimeAgo from "@/lib/formatTimeAgo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocument, updateDocument } from "@/api/document";
import { useParams } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";

import { useTranslationSidebarParams } from "@/hooks/useQueryParams";

interface TranslationItemProps {
  translation: Translation;
}

const TranslationItem: React.FC<TranslationItemProps> = ({
  translation,
}) => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const rootId = id as string;
  const { setSelectedTranslationId } = useTranslationSidebarParams();



  // Helper function to render the status indicator
  const refetchTranslations = () =>
    queryClient.invalidateQueries({
      queryKey: [`translations-${rootId}`],
    });

  const deleteTranslationMutation = useMutation({
    mutationFn: (translationId: string) => deleteDocument(translationId),
    onSuccess: () => {
      // Refresh document data and translations list
      refetchTranslations();
      // Clear the deleting state
    },
    onError: (error) => {
      console.error("Error deleting translation:", error);
      // Clear the deleting state on error too
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
      return await updateDocument(data.id, {
        name: data.name,
        content: undefined,
      });
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

  const onEdit = (translationId: string, name: string) => {
    // Implement edit functionality here
    updateTitleMutation.mutate({ id: translationId, name });
  };
  const onDelete = (translationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm("Are you sure you want to delete this translation?")) {
      // Set the deleting state before starting the mutation
      deleteTranslationMutation.mutate(translationId);
    }
  };
  const renderStatusIndicator = () => {
    if (isDeleting) {
      return (
        <>
          <Trash2 className="h-3 w-3 mr-1 animate-pulse text-red-500" />
          <span className="text-red-500">Deleting...</span>
        </>
      );
    }

    return formatTimeAgo(translation.updatedAt);
  };
  const isDeleting = deleteTranslationMutation.isPending;
  const isUpdating = updateTitleMutation.isPending;
  const disabled = isDeleting || isUpdating;
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
            if (e.key === "Enter" && !disabled) {
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
              color={"#d1d5db"}
              className="flex-shrink-0"
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 capitalize">
              {translation.language}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between gap-2">
              <div className="truncate">{translation.name}</div>
            </div>
            <div className="text-xs text-gray-500 capitalize flex items-center">
              {renderStatusIndicator()}
            </div>
          </div>
          {isDeleting || isUpdating ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <TranslationMenu
              initialValue={translation.name}
              onEdit={(name) => onEdit(translation.id, name)}
              onDelete={(e) => onDelete(translation.id, e)}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default TranslationItem;
