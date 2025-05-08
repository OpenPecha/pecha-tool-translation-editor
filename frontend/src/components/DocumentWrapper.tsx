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
import { IoIosArrowForward } from "react-icons/io";

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
          <div className="flex-1 relative gap-2 flex items-center group">
            <div className="relative h-full">
              {/* Vertical Line (hidden by default, shows on hover) */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              {/* Arrow (hidden by default, shows on hover) */}
              <div
                className="absolute bg-white border rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer text-gray-700 text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={() => handleSelectTranslation(null)}
              >
                <IoIosArrowForward />
              </div>
            </div>
            <DocumentEditor
              docId={selectedTranslationId}
              isEditable={isEditable}
            />
          </div>
        )}
      </div>
    </EditorProvider>
  );
}

export default DocumentsWrapper;
