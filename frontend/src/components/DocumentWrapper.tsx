import { useState, useMemo } from "react";

import MenuDrawer from "./MenuDrawer";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import { YjsProvider } from "../lib/yjsProvider";
import SelectTranslation from "./SelectTranslation";

export interface Translation {
  id: string;
  identifier: string;
}

function DocumentWrapper() {
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
    <>
      {/* {selectedTranslationId && (
        <MenuDrawer quill1Ref={quill1Ref} quill2Ref={quill2Ref} />
      )} */}
      <div id="toolbar-container"></div>
      <div className="flex px-2  h-[calc(100dvh-52px)]">
        <EditorProvider>
          <YjsProvider>
            <DocumentEditor docId={id} />
          </YjsProvider>
          {!selectedTranslationId ? (
            <SelectTranslation
              translations={translations}
              setSelectedTranslationId={setSelectedTranslationId}
            />
          ) : (
            <YjsProvider key={selectedTranslationId}>
              <DocumentEditor docId={selectedTranslationId} />
            </YjsProvider>
          )}
        </EditorProvider>
      </div>
    </>
  );
}

export default DocumentWrapper;
