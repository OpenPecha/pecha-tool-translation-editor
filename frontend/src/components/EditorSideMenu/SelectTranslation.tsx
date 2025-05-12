import { useMemo, useState } from "react";
import { GrDocument } from "react-icons/gr";
import { Plus, Trash2 } from "lucide-react";
import { Translation } from "../DocumentWrapper";
import { Button } from "../ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { deleteDocument } from "@/api/document";
import formatTimeAgo from "@/lib/formatTimeAgo";

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
  const handleCreateSuccess = () => {
    setShowCreateModal(false);
  };
  // Check if the current document is a root document
  const isRoot = Boolean(
    currentDoc && "isRoot" in currentDoc ? currentDoc.isRoot : false
  );

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
          translations.map((translation: Translation) => (
            <div key={translation.id} className="flex items-center w-full">
              <button
                onClick={() => setSelectedTranslationId(translation.id)}
                onKeyDown={(e) =>
                  e.key === "Enter" && setSelectedTranslationId(translation.id)
                }
                className="cursor-pointer flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md w-full text-left flex-grow"
                aria-label={`Open translation ${translation.id}`}
              >
                <div className="relative flex items-center">
                  <GrDocument
                    size={24}
                    color="lightblue"
                    className="flex-shrink-0"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-600 capitalize">
                    {translation.language}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden ">
                  <div className="flex justify-between gap-2">
                    <div className="truncate">{translation.name}</div>
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {formatTimeAgo(translation.updatedAt)}
                  </div>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={(e) => handleDeleteTranslation(translation.id, e)}
                disabled={deleteTranslationMutation.isPending}
                aria-label={`Delete translation ${translation.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateTranslationModal
          rootId={rootId}
          rootName={currentDoc?.name ?? "document"}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

export default SelectTranslation;
