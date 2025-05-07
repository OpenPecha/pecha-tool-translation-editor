import { useState, useEffect, useRef } from "react";

import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import SideMenu from "./EditorSideMenu/Sidemenu";
import { ChevronRight } from "lucide-react";
import MenuDrawer from "./MenuDrawer";
import Navbar from "./Navbar";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";

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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <EditorProvider>
      <Navbar title={currentDoc?.name} />
      {selectedTranslationId && (
        <MenuDrawer rootId={id!} translationId={selectedTranslationId} />
      )}
      <div id="toolbar-container"></div>
      <div className="relative flex px-2  h-[calc(100dvh-110px)] w-full">
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
