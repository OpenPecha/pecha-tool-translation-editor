import { useState } from "react";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import SideMenu from "./EditorSideMenu/Sidemenu";
import SettingsButton from "./setting/SettingsButton";
import Navbar from "./Navbar";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";
import { createPortal } from "react-dom";
import { IoIosArrowForward } from "react-icons/io";
import TranslationSidebar from "./TranslationSidebar";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import Split from "react-split";


import isMobile from "@/lib/isMobile";
export type { Translation } from "@/hooks/useCurrentDoc";

function DocumentsWrapper() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, isEditable } = useCurrentDoc(id);
  const { selectedTranslationId, clearSelectedTranslationId } = useTranslationSidebarParams();
  const [splitPosition, setSplitPosition] = useState<number>(40);
  

  const project = {
    id: currentDoc?.rootProjectId || currentDoc?.rootProject?.id || "",
    name: currentDoc?.rootProject?.name || "Project",
  };
  return (
    <EditorProvider>
      {/* Portals for elements that need to be rendered outside the main container */}
      {createPortal(
        <Navbar project={project} />,
        document.getElementById("navbar")!
      )}
      {createPortal(
        <SettingsButton />,
        document.getElementById("settings")!
      )}

      {/* Main editor container - uses CSS Grid for better layout control */}
      <div className="grid grid-rows-[1fr] h-full">
        <div className="relative flex px-2 w-full overflow-hidden ">
          {isEditable === undefined ? (
            <Loader show={isEditable === undefined} />
          ) : (
            <>
              {!selectedTranslationId ? (
                <>
                    <DocumentEditor
                      docId={id}
                      isEditable={isEditable}
                      currentDoc={currentDoc}
                    />
                  <SideMenu />
                </>
              ) : (
                <div className="relative h-full w-full group">
                  {/* Close button positioned dynamically in the middle of the gutter */}
                  <button
                    className="absolute bg-neutral-50 dark:bg-neutral-600 border-2 border-gray-300 cursor-pointer rounded-full p-2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-neutral-700 dark:text-neutral-300 text-xl opacity-0 group-hover:opacity-100 duration-200 shadow-lg hover:shadow-xl hover:border-gray-400"
                    style={{ left: `${splitPosition}%` }}
                    onClick={() => clearSelectedTranslationId()}
                    aria-label="Close translation view"
                    title="Close translation view"
                    type="button"
                  >
                    <IoIosArrowForward />
                  </button>
                  
                  <Split
                    sizes={[splitPosition, 100 - splitPosition]}
                    minSize={[300, 400]}
                    expandToMin={false}
                    gutterSize={8}
                    gutterAlign="center"
                    snapOffset={30}
                    dragInterval={1}
                    direction={isMobile?"vertical":"horizontal"}
                    cursor="col-resize"
                  className={`split-pane h-full flex w-full overflow-hidden ${isMobile?"flex-col":"flex-row"}`}
                    gutterStyle={() => ({
                      backgroundColor: '#e5e7eb',
                      border: '1px solid #d1d5db',
                      cursor: 'col-resize',
                      position: 'relative',
                    })}
                    onDragStart={() => {
                      document.body.style.cursor = 'col-resize';
                    }}
                    onDragEnd={(sizes) => {
                      document.body.style.cursor = '';
                      setSplitPosition(sizes[0]);
                    }}
                    onDrag={(sizes) => {
                      setSplitPosition(sizes[0]);
                    }}
                  >
                    {/* Root Editor */}
                      <DocumentEditor
                        docId={id}
                        isEditable={isEditable}
                        currentDoc={currentDoc}
                      />
                    
                    {/* Translation Editor + Sidebar */}
                      <TranslationEditor
                        selectedTranslationId={selectedTranslationId}
                        isEditable={isEditable}
                      />
                  </Split>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </EditorProvider>
  );
}

function TranslationEditor({
  selectedTranslationId,
  isEditable,
}: {
  readonly selectedTranslationId: string;
  readonly isEditable: boolean;
}) {
  const { currentDoc } = useCurrentDoc(selectedTranslationId);

  return (
    <div className="h-full flex w-full">
      {/* Translation Editor */}
      <div className="flex-1 h-full translation-editor-container">
        {currentDoc && (
          <DocumentEditor
            docId={selectedTranslationId}
            isEditable={isEditable}
            currentDoc={currentDoc}
          />
        )}
      </div>
      
      {/* Translation Sidebar - Sticky */}
      {
!isMobile &&
       <div className="h-full overflow-y-auto sticky top-0">
        <TranslationSidebar documentId={selectedTranslationId!} />
      </div>
}
    </div>
  );
}


function Loader({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex bg-white/80 dark:bg-neutral-900/80 z-50">
      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-10 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-3/4 mb-8"></div>
        <div className="h-6 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full"></div>
        <div className="h-6 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-5/6"></div>
        <div className="h-6 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-4/6"></div>
        <div className="h-6 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-5/6"></div>
        <div className="h-6 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-3/6"></div>
        <div className="h-64 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full mt-6"></div>
        <div className="h-24 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full mt-4"></div>
      </div>

      {/* Sidebar skeleton */}
      <div className="w-20 h-full border-r border-neutral-200 dark:border-neutral-600 p-4 space-y-4">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-3/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-5/6 mt-6"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-4/6 mt-2"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-5/6 mt-2"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-3/6 mt-2"></div>
        <div className="mt-8 space-y-3">
          <div className="h-10 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-600 rounded-md animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
}

export default DocumentsWrapper;
