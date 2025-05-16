import { useState } from "react";

import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import SideMenu from "./EditorSideMenu/Sidemenu";
import MenuDrawer from "./MenuDrawer";
import Navbar from "./Navbar";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";
import { createPortal } from "react-dom";
import { IoIosArrowForward } from "react-icons/io";

export type { Translation } from "@/hooks/useCurrentDoc";

function DocumentsWrapper() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, isEditable } = useCurrentDoc(id);
  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);
  // Handle translation selection with proper cleanup
  const handleSelectTranslation = (translationId: string | null) => {
    setSelectedTranslationId(translationId);
  };
  const project = {
    id: currentDoc?.rootProjectId,
    name: currentDoc?.rootsProject?.name,
  };
  return (
    <EditorProvider>
      {/* Portals for elements that need to be rendered outside the main container */}
      {createPortal(
        <Navbar title={currentDoc?.name} project={project} />,
        document.getElementById("navbar")!
      )}
      {selectedTranslationId &&
        createPortal(
          <MenuDrawer rootId={id!} translationId={selectedTranslationId} />,
          document.getElementById("sync-option")!
        )}

      {/* Main editor container - uses CSS Grid for better layout control */}
      <div className="grid grid-rows-[1fr] h-full">
        <div className="relative flex px-2 w-full overflow-hidden ">
          <DocumentEditor docId={id} isEditable={isEditable} />
          {!selectedTranslationId ? (
            <SideMenu setSelectedTranslationId={handleSelectTranslation} />
          ) : (
            <div className="relative w-full flex flex-1 group">
              <div className="relative h-full">
                {/* Vertical Line (hidden by default, shows on hover) */}
                <div className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {/* Arrow (hidden by default, shows on hover) */}
                <button
                  className="absolute bg-white border z-[99] cursor-pointer rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-700 text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={() => handleSelectTranslation(null)}
                  aria-label="Close translation view"
                  title="Close translation view"
                  type="button"
                >
                  <IoIosArrowForward />
                </button>
              </div>
              <DocumentEditor
                docId={selectedTranslationId}
                isEditable={isEditable}
              />
            </div>
          )}
        </div>
      </div>
    </EditorProvider>
  );
}

export default DocumentsWrapper;
