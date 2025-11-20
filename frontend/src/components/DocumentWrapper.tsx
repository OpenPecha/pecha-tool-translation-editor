import { useState } from "react";
import { createPortal } from "react-dom";
import { IoIosArrowForward } from "react-icons/io";
import { useParams } from "react-router-dom";
import Split from "react-split";
import { EditorProvider } from "@/contexts/EditorContext";
import LiveBlockProvider, {
  useLiveBlockActive,
} from "@/contexts/LiveBlockProvider";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import isMobile from "@/lib/isMobile";
import DocumentEditor from "./DocumentEditor";
import SideMenu from "./EditorSideMenu/Sidemenu";
import Navbar from "./Navbar";
import { useSelectionStore, Selection, EditorId } from "@/stores/selectionStore";
import { useEditor } from "@/contexts/EditorContext";
import Quill from "quill";

export type { Translation } from "@/hooks/useCurrentDoc";

function DocumentsWrapperContent() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, isEditable } = useCurrentDoc(id);
  const { selectedTranslationId, clearSelectedTranslationId } =
    useTranslationSidebarParams();
  const [splitPosition, setSplitPosition] = useState<number>(50);
  const { setManualSelection, setLineFocus } = useSelectionStore();
  const { getQuill, getTextByLineNumber } = useEditor();

  const getFullLineSelection = (
    quill: Quill | null,
    lineNumber: number
  ): Selection | null => {
    if (!quill) return null;
    const text = getTextByLineNumber(quill, lineNumber);
    if (text === null) return null;

    // This is an approximation. A more precise way would be to find the
    // exact blot for the line number and get its index.
    const lines = quill.getLines();
    if (lineNumber < 1 || lineNumber > lines.length) return null;
    const lineBlot = lines[lineNumber - 1];
    const index = quill.getIndex(lineBlot);

    return {
      startLine: lineNumber,
      range: {
        index: index,
        length: text.length,
      },
      text: text,
    };
  };

  const handleManualSelect = (
    editorId: EditorId,
    selection: Selection
  ) => {
    setManualSelection(editorId, selection);
  };

  const handleLineFocus = (lineNumber: number, editorId: EditorId) => {
    const quill = getQuill(editorId);
    const selection = getFullLineSelection(quill, lineNumber);
    setLineFocus(editorId, selection);
  };

  const project = {
    id: currentDoc?.rootProjectId || currentDoc?.rootProject?.id || "",
    name: currentDoc?.rootProject?.name || "Project",
  };
  const isLiveEnabled = useLiveBlockActive(currentDoc);

  if (!id) return null;

  const renderContent = () => {
    if (isEditable === undefined) {
      return <Loader show />;
    }

    const isSplitView = !!selectedTranslationId;

    return (
      <div className="relative h-full w-full group">
        {isSplitView && (
          <button
            className="absolute bg-neutral-50 dark:bg-neutral-600 border-2 border-gray-300 cursor-pointer rounded-full p-2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-neutral-700 dark:text-neutral-300 text-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover/translation:opacity-100 duration-200 shadow-lg hover:shadow-xl hover:border-gray-400 transition-opacity z-10"
            style={{ left: isMobile ? "97%" : `${splitPosition}%` }}
            onClick={clearSelectedTranslationId}
            aria-label="Close translation view"
            title="Close translation view"
            type="button"
          >
            <IoIosArrowForward />
          </button>
        )}

        <Split
          sizes={isSplitView ? [splitPosition, 100 - splitPosition] : [100, 0]}
          minSize={isSplitView ? [300, 400] : [100, 0]}
          expandToMin={false}
          gutterSize={isSplitView ? 8 : 0}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction={isMobile ? "vertical" : "horizontal"}
          cursor="col-resize"
          className={`split-pane h-full flex w-full overflow-hidden ${
            isMobile ? "flex-col" : "flex-row"
          }`}
          gutterStyle={() => ({
            backgroundColor: "#e5e7eb",
            border: "1px solid #d1d5db",
            cursor: "col-resize",
            position: "relative",
          })}
          onDragStart={() => {
            if (isSplitView) document.body.style.cursor = "col-resize";
          }}
          onDragEnd={(sizes) => {
            if (isSplitView) {
              document.body.style.cursor = "";
              setSplitPosition(sizes[0]);
            }
          }}
          onDrag={(sizes) => {
            if (isSplitView) setSplitPosition(sizes[0]);
          }}
        >
          {/* Pane 1: Main Editor (always mounted) */}
          <div className="h-full w-full flex">
            <div className="flex-1 h-full relative">
              {currentDoc && (
                <LiveBlockProvider roomId={id} enabled={isLiveEnabled}>
                  <DocumentEditor
                    isTranslationEditor={false}
                    liveEnabled={isLiveEnabled}
                    docId={id}
                    isEditable={isEditable}
                    currentDoc={currentDoc}
                    onManualSelect={handleManualSelect}
                    onLineFocus={handleLineFocus}
                  />
                </LiveBlockProvider>
              )}
            </div>
            {!isSplitView && <SideMenu />}
          </div>

          {/* Pane 2: Translation Editor (content mounted conditionally) */}
          <div className="group/translation h-full w-full overflow-hidden">
            {isSplitView && selectedTranslationId && (
              <TranslationEditor
                selectedTranslationId={selectedTranslationId}
                isEditable={!!isEditable}
                sourceDocId={id}
                onManualSelect={handleManualSelect}
                onLineFocus={handleLineFocus}
              />
            )}
          </div>
        </Split>
      </div>
    );
  };

  return (
    <>
      {/* Portals for elements that need to be rendered outside the main container */}
      {createPortal(
        <Navbar project={project} />,
        document.getElementById("navbar")!
      )}

      {/* Main editor container - uses CSS Grid for better layout control */}
      <div className="grid grid-rows-[1fr] h-full">
        <div className="relative flex  w-full overflow-hidden ">
          {renderContent()}
        </div>
      </div>
    </>
  );
}

function DocumentsWrapper() {
  return (
    <EditorProvider>
      <DocumentsWrapperContent />
    </EditorProvider>
  );
}

function TranslationEditor({
  selectedTranslationId,
  isEditable,
  sourceDocId: _sourceDocId,
  onManualSelect,
  onLineFocus,
}: {
  readonly selectedTranslationId: string;
  readonly isEditable: boolean;
  readonly sourceDocId: string;
  onManualSelect: (editorType: EditorType, selection: Selection) => void;
  onLineFocus: (lineNumber: number, editorType: EditorType) => void;
}) {
  const { currentDoc: translationDoc } = useCurrentDoc(selectedTranslationId);
  const isLiveEnabled = useLiveBlockActive(translationDoc);

  return (
    <div className="h-full flex w-full">
      {/* Translation Editor */}
      <div className="flex-1 h-full translation-editor-container relative">
        {translationDoc && (
          <LiveBlockProvider
            roomId={selectedTranslationId}
            enabled={isLiveEnabled}
          >
            <DocumentEditor
              isTranslationEditor={true}
              liveEnabled={isLiveEnabled}
              docId={selectedTranslationId}
              isEditable={isEditable}
              currentDoc={translationDoc}
              onManualSelect={onManualSelect}
              onLineFocus={onLineFocus}
            />
          </LiveBlockProvider>
        )}
      </div>
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
