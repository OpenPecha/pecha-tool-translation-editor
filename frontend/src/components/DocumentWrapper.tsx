import { useState, useMemo } from "react";

import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import { YjsProvider } from "../lib/yjsProvider";
import SideMenu from "./EditorSideMenu/Sidemenu";
import { ChevronRight } from "lucide-react";
import MenuDrawer from "./MenuDrawer";
import Navbar from "./Navbar";

export interface Translation {
  id: string;
  identifier: string;
  language: string;
}

function DocumentsWrapper() {
  const { id } = useParams();
  const { currentDoc, loading, error } = useCurrentDoc(id);
  const translations = useMemo(
    () => currentDoc?.translations ?? [],
    [currentDoc?.translations]
  );
  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  if (error) {
    return <div className="error">{error}</div>;
  }
  return (
    <EditorProvider>
      <>
        <Navbar title={currentDoc?.identifier} />
        {selectedTranslationId && (
          <MenuDrawer rootId={id!} translationId={selectedTranslationId} />
        )}
        <div id="toolbar-container"></div>
        <div className="relative flex px-2  h-[calc(100dvh-100px)] w-full">
          <YjsProvider>
            <DocumentEditor docId={id} />
          </YjsProvider>

          {!selectedTranslationId ? (
            <SideMenu
              translations={translations}
              setSelectedTranslationId={setSelectedTranslationId}
              doc_info={currentDoc}
            />
          ) : (
            <YjsProvider key={selectedTranslationId}>
              <DocumentEditor docId={selectedTranslationId} />
            </YjsProvider>
          )}

          {selectedTranslationId && (
            <div className="relative">
              <button
                onClick={() => setSelectedTranslationId(null)}
                className="absolute right-2 top-2 z-10 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
                aria-label="Close translation view"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </>
    </EditorProvider>
  );
}

export default DocumentsWrapper;
