import { useState } from "react";

import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import SideMenu from "./EditorSideMenu/Sidemenu";
import { ChevronRight } from "lucide-react";
import MenuDrawer from "./MenuDrawer";
import Navbar from "./Navbar";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";
import { createPortal } from "react-dom";

export interface Translation {
  id: string;
  identifier: string;
  language: string;
}

function DocumentsWrapper() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, loading, error, isEditable } = useCurrentDoc(id);
  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);

  // Handle translation selection with proper cleanup
  const handleSelectTranslation = (translationId: string | null) => {
    setSelectedTranslationId(translationId);
  };

  return (
    <EditorProvider>
      {createPortal(
        <Navbar title={currentDoc?.name} />,
        document.getElementById("navbar")
      )}
      {selectedTranslationId && (
        <MenuDrawer rootId={id!} translationId={selectedTranslationId} />
      )}
      <div className="relative flex px-2 w-full max-h-[calc(100vh-88px)] overflow-hidden bg-white">
        <DocumentEditor docId={id} isEditable={isEditable} />
        {!selectedTranslationId ? (
          <SideMenu setSelectedTranslationId={handleSelectTranslation} />
        ) : (
          <>
            <DocumentEditor
              docId={selectedTranslationId}
              isEditable={isEditable}
            />
            <button
              onClick={() => handleSelectTranslation(null)}
              className="absolute right-4 top-16 z-10 cursor-pointer rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
              aria-label="Close translation view"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </EditorProvider>
  );
}

export default DocumentsWrapper;
