import { useMemo, useState } from "react";
import { GrDocument } from "react-icons/gr";
import { Plus } from "lucide-react";
import { Translation } from "../DocumentWrapper";
import { Button } from "../ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";

function SelectTranslation({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { id } = useParams();
  const rootId = id as string;
  const { currentDoc } = useCurrentDoc(rootId);
  const translations = useMemo(
    () => currentDoc?.translations ?? [],
    [currentDoc?.translations]
  );
  const handleCreateSuccess = (translationId: string) => {
    setShowCreateModal(false);
    // setSelectedTranslationId(translationId);
  };
  const isRoot = currentDoc?.isRoot;
  const getTranslationDate = (identifier: string) => {
    const parts = identifier.split("-");
    const timestamp = parts.length > 1 ? parts[parts.length - 1] : "";
    const name =
      parts.length > 1
        ? parts.slice(0, parts.length - 1).join("-")
        : identifier;
    const time = new Date(parseInt(timestamp)).toLocaleDateString();
    return { name, time };
  };
  return (
    <div className="mt-3 rounded-lg overflow-hidden">
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
                <div className="flex justify-between">
                  <div className="truncate">
                    {getTranslationDate(translation.identifier).name}
                  </div>
                  <div>{getTranslationDate(translation.identifier).time}</div>
                </div>
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
          rootId={rootId}
          rootIdentifier={currentDoc?.identifier || "document"}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

export default SelectTranslation;
