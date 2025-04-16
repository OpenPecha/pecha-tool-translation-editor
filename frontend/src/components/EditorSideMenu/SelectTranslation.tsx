import { useMemo, useState } from "react";
import { GrDocument } from "react-icons/gr";
import { Plus } from "lucide-react";
import { Translation } from "../DocumentWrapper";
import { Button } from "../ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";

interface DocumentInfo {
  id: string;
  identifier: string;
  isRoot: boolean;
}

function SelectTranslation({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { id } = useParams();
  const rootDocId = id as string;
  const { currentDoc } = useCurrentDoc(rootDocId);
  const translations = useMemo(
    () => currentDoc?.translations ?? [],
    [currentDoc?.translations]
  );
  const handleCreateSuccess = (translationId: string) => {
    setShowCreateModal(false);
    setSelectedTranslationId(translationId);
  };
  const isRoot = currentDoc?.isRoot;
  return (
    <div className="mt-3 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Translations</h3>
        {isRoot && (
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="flex items-center gap-1 h-8"
          >
            <Plus className="h-4 w-4" />
            Add Translation
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
            <button
              key={translation.id}
              onClick={() => setSelectedTranslationId(translation.id)}
              onKeyDown={(e) =>
                e.key === "Enter" && setSelectedTranslationId(translation.id)
              }
              className="cursor-pointer flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md w-full text-left"
              aria-label={`Open translation: ${translation.identifier}`}
            >
              <GrDocument className="flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="truncate">{translation.identifier}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {translation.language}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateTranslationModal
          rootDocId={rootDocId}
          rootIdentifier={doc_info?.identifier || "document"}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

export default SelectTranslation;
