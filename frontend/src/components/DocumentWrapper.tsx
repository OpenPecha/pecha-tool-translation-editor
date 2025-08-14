import { useEffect, useState } from "react";
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
import { fetchTranslationStatusByJobId } from "@/api/document";
import { useQuery } from "@tanstack/react-query";
import TranslationSidebar from "./TranslationSidebar";
import Split from "react-split";

export type { Translation } from "@/hooks/useCurrentDoc";

function DocumentsWrapper() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, isEditable } = useCurrentDoc(id);
  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);
  const [splitPosition, setSplitPosition] = useState<number>(40);
  // Handle translation selection with proper cleanup
  const handleSelectTranslation = (translationId: string | null) => {
    setSelectedTranslationId(translationId);
  };
  const project = {
    id: currentDoc?.rootProjectId || currentDoc?.rootsProject?.id || "",
    name: currentDoc?.rootsProject?.name || "Project",
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
                  <SideMenu
                    setSelectedTranslationId={handleSelectTranslation}
                    documentId={id!}
                    isEditable={isEditable}
                  />
                </>
              ) : (
                <div className="relative h-full w-full group">
                  {/* Close button positioned dynamically in the middle of the gutter */}
                  <button
                    className="absolute bg-white border-2 border-gray-300 z-[9999] cursor-pointer rounded-full p-2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-700 text-xl opacity-0 group-hover:opacity-100 duration-200 shadow-lg hover:shadow-xl hover:border-gray-400"
                    style={{ left: `${splitPosition}%` }}
                    onClick={() => handleSelectTranslation(null)}
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
                    direction="horizontal"
                    cursor="col-resize"
                    className="h-full flex w-full"
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
                        handleSelectTranslation={handleSelectTranslation}
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
  handleSelectTranslation,
}: {
  readonly selectedTranslationId: string;
  readonly isEditable: boolean;
  readonly handleSelectTranslation: (translationId: string | null) => void;
}) {
  const { currentDoc } = useCurrentDoc(selectedTranslationId);
  if (
    currentDoc?.translationStatus &&
    currentDoc?.translationStatus !== "completed"
  ) {
    return (
      <TranslationFetcher
        jobId={currentDoc?.translationJobId!}
        handleSelectTranslation={handleSelectTranslation}
      />
    );
  }

  // Extract text content from document for translation
  const getDocumentText = () => {
    if (currentDoc?.docs_prosemirror_delta?.ops) {
      return currentDoc.docs_prosemirror_delta.ops
        .filter((op: any) => typeof op.insert === "string")
        .map((op: any) => op.insert)
        .join("");
    }
    return "";
  };

  return (
    <div className="h-full flex w-full">
      {/* Translation Editor */}
      <div className="flex-1 h-full translation-editor-container">
        <DocumentEditor
          docId={selectedTranslationId}
          isEditable={isEditable}
          currentDoc={currentDoc}
        />
      </div>
      
      {/* Translation Sidebar - Sticky */}
      <div className="h-full overflow-y-auto sticky top-0">
        <TranslationSidebar documentId={selectedTranslationId!} />
      </div>
    </div>
  );
}

function TranslationFetcher({
  jobId,
  handleSelectTranslation,
}: {
  jobId: string;
  handleSelectTranslation: (translationId: string | null) => void;
}) {
  //get translation status from api tat
  const { data, isLoading, error } = useQuery({
    queryKey: ["translation-status", jobId],
    queryFn: () => fetchTranslationStatusByJobId(jobId),
    refetchInterval: 2000,
    enabled: !!jobId,
  });
  useEffect(() => {
    if (data?.status?.status_type === "completed") {
      setTimeout(() => {
        handleSelectTranslation(null);
      }, 1000);
    }
  }, [data?.status?.status_type]);
  const transaltedText = data?.translated_text;
  if (isLoading || !transaltedText) return null;
  return <textarea className="w-[50vw] h-full">{transaltedText}</textarea>;
}

function Loader({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex bg-white/80 z-50">
      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-10 bg-gray-200 rounded-md animate-pulse w-3/4 mb-8"></div>
        <div className="h-6 bg-gray-200 rounded-md animate-pulse w-full"></div>
        <div className="h-6 bg-gray-200 rounded-md animate-pulse w-5/6"></div>
        <div className="h-6 bg-gray-200 rounded-md animate-pulse w-4/6"></div>
        <div className="h-6 bg-gray-200 rounded-md animate-pulse w-5/6"></div>
        <div className="h-6 bg-gray-200 rounded-md animate-pulse w-3/6"></div>
        <div className="h-64 bg-gray-200 rounded-md animate-pulse w-full mt-6"></div>
        <div className="h-24 bg-gray-200 rounded-md animate-pulse w-full mt-4"></div>
      </div>

      {/* Sidebar skeleton */}
      <div className="w-20 h-full border-r border-gray-200 p-4 space-y-4">
        <div className="h-8 bg-gray-200 rounded-md animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-5/6 mt-6"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-4/6 mt-2"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-5/6 mt-2"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-3/6 mt-2"></div>
        <div className="mt-8 space-y-3">
          <div className="h-10 bg-gray-200 rounded-md animate-pulse w-full"></div>
          <div className="h-10 bg-gray-200 rounded-md animate-pulse w-full"></div>
          <div className="h-10 bg-gray-200 rounded-md animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
}

export default DocumentsWrapper;
