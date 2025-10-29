import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { GrDocument } from "react-icons/gr";
import { useParams } from "react-router-dom";
import { deleteDocument, updateDocument } from "@/api/document";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import formatTimeAgo from "@/lib/formatTimeAgo";
import { languages } from "@/utils/Constants";
import type { Translation } from "../../DocumentWrapper";
import TranslationMenu from "./TranslationMenu";

interface TranslationItemProps {
  translation: Translation;
}

const TranslationItem: React.FC<TranslationItemProps> = ({ translation }) => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const rootId = id as string;
  const { setSelectedTranslationId } = useTranslationSidebarParams();
  const { t } = useTranslate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to render the status indicator
  const refetchTranslations = () =>
    queryClient.invalidateQueries({
      queryKey: [`translations-${rootId}`],
    });

  // Helper function to get language info
  const getLanguageInfo = (languageCode: string) => {
    const languageInfo = languages.find((lang) => lang.code === languageCode);
    return (
      languageInfo || { code: languageCode, name: languageCode, flag: "📄" }
    );
  };

  const deleteTranslationMutation = useMutation({
    mutationFn: (translationId: string) => deleteDocument(translationId),
    onSuccess: () => {
      // Refresh document data and translations list
      refetchTranslations();
      // Clear the deleting state
    },
    onError: (error) => {
      console.error(t("translation.errorDeletingTranslation"), error);
      // Clear the deleting state on error too
      window.alert(
        `Error: ${
          error instanceof Error
            ? error.message
            : t("translation.failedToDeleteTranslation")
        }`
      );
    },
  });

  // Set up mutation for updating document
  const updateDocumentMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      language?: string;
    }) => {
      if (!id) throw new Error("Document ID not found");
      // Update the document name and/or language
      const updateData: any = { content: undefined };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.language !== undefined) updateData.language = data.language;

      return await updateDocument(data.id, updateData);
    },
    onSuccess: () => {
      // Invalidate and refetch document data and translations
      refetchTranslations();
    },
    onError: (error) => {
      console.error(t("translation.failedToUpdateDocument"), error);
    },
  });
  const isDeleting = deleteTranslationMutation.isPending;
  const isUpdating = updateDocumentMutation.isPending;
  const disabled = isDeleting || isUpdating;
  const onEdit = (translationId: string, name?: string, language?: string) => {
    // Implement edit functionality here
    const updateData: { id: string; name?: string; language?: string } = {
      id: translationId,
    };
    if (name !== undefined) updateData.name = name;
    if (language !== undefined) updateData.language = language;
    updateDocumentMutation.mutate(updateData);
  };
  const onDelete = (translationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (
      window.confirm(t("translation.areYouSureYouWantToDeleteThisTranslation"))
    ) {
      // Set the deleting state before starting the mutation
      deleteTranslationMutation.mutate(translationId);
    }
  };

  return (
    <div
      key={translation.id}
      className={`group flex w-full items-center gap-2 rounded-md p-2 ${
        !disabled && "hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          // Only allow selection if translation is completed and modal is not open
          if (!disabled && !isModalOpen) {
            setSelectedTranslationId(translation.id);
          }
        }}
        className={`flex flex-1 items-center gap-2 text-left ${
          disabled ? "cursor-not-allowed opacity-70" : ""
        }`}
        aria-label={`Open translation ${translation.id}`}
        disabled={disabled}
      >
        <div className="relative flex items-center">
          <GrDocument size={24} color={"#d1d5db"} className="flex-shrink-0" />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 capitalize">
            {getLanguageInfo(translation.language).flag}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between gap-2">
            <div className="truncate">{translation.name}</div>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span className="capitalize">
              {getLanguageInfo(translation.language).name}
            </span>
            <span>•</span>
            <span>
              <RenderStatusIndicator isDeleting={isDeleting} />
            </span>
          </div>
        </div>
      </button>
      {isDeleting || isUpdating ? (
        <FaSpinner className="animate-spin" />
      ) : (
        <TranslationMenu
          translation={translation}
          onEdit={(name, language) => onEdit(translation.id, name, language)}
          onDelete={(e) => onDelete(translation.id, e)}
          onModalOpenChange={setIsModalOpen}
        />
      )}
    </div>
  );
};

function RenderStatusIndicator({
  isDeleting,
}: {
  readonly isDeleting: boolean;
}) {
  if (isDeleting) {
    return (
      <>
        <Trash2 className="h-3 w-3 mr-1 animate-pulse text-red-500" />
        <span className="text-red-500 dark:text-red-400">Deleting...</span>
      </>
    );
  }
  return null;
}
export default TranslationItem;
