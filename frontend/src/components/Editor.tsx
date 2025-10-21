import Quill from "quill";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar/Toolbar";
import "quill/dist/quill.snow.css";
import "quill-footnote/dist/quill-footnote.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { footnoteKeyboardBindings } from "quill-footnote";
import { createPortal } from "react-dom";
import { QuillBinding } from "y-quill";
import type * as Y from "yjs";
import { updateContentDocument } from "@/api/document";
import { useAuth } from "@/auth/use-auth-hook";
import { useEditor } from "@/contexts/EditorContext";
import { getUserContext, useUmamiTracking } from "@/hooks/use-umami-tracking";
import type { Document } from "@/hooks/useCurrentDoc";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { checkIsTibetan } from "@/lib/isTibetan";
import {
  EDITOR_ENTER_ONLY,
  MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION,
  editor_config,
} from "@/utils/editorConfig";
import { useQuillVersion } from "../contexts/VersionContext";
import CommentBubble from "./Comment/CommentBubble";
import CommentInitialize from "./Comment/CommentInitialize";
import LineNumberVirtualized from "./LineNumbers";
import quill_import from "./quillExtension";
import type { CustomFootnoteModule } from "./quillExtension/CustomFootnote";
import SkeletonLoader from "./SkeletonLoader";
import TableOfContent from "./TableOfContent";
import AnnotationList from "./Annotation/AnnotationList";
import { handleAnnotationVote } from "./quill_func";

quill_import();

const Editor = ({
  documentId,
  isEditable,
  currentDoc,
  yText,
  provider,
}: {
  documentId?: string;
  isEditable: boolean;
  currentDoc: Document;
  yText: Y.Text | undefined;
  provider: any | undefined;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).slice(2, 6);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).slice(2, 6);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { registerQuill, transitionPhase } = useQuillVersion();
  const [isTibetan, setIsTibetan] = useState(false);
  const {
    registerQuill: registerQuill2,
    unregisterQuill: unregisterQuill2,
    getLineNumber,
  } = useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const { t } = useTranslate();
  const { currentUser } = useAuth();
  const { trackDocumentOpened, trackDocumentSaved } = useUmamiTracking();
  // Get display settings
  const { showLineNumbers } = useDisplaySettings();

  useEffect(() => {
    if (!yText || !provider) return () => {};
    const name = currentUser?.name || "Anonymous User";
    // Generate a random dark color (R, G, and B <= 100)
    function getRandomDarkColor() {
      const r = Math.floor(Math.random() * 100);
      const g = Math.floor(Math.random() * 100);
      const b = Math.floor(Math.random() * 100);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    const color = getRandomDarkColor();
    provider.awareness.setLocalStateField("user", {
      name,
      color,
    });
  }, [currentUser?.name]);
  // Track document opening

  const updateDocumentMutation = useMutation({
    mutationFn: (content: Record<string, unknown>) =>
      updateContentDocument(documentId as string, {
        content: content.ops,
      }),
    onError: (error) => {
      console.error("Error updating document content:", error);
    },
    onSuccess: () => {
      // refetch versions
      queryClient.invalidateQueries({ queryKey: [`versions-${documentId}`] });

      // Track document save
      if (documentId) {
        trackDocumentSaved(documentId, "auto", getUserContext(currentUser));
      }
    },
  });
  const isSaving = updateDocumentMutation.isPending;
  const queryClient = useQueryClient();

  const debouncedSave = useCallback(
    (content: Record<string, unknown>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (!documentId) return;
        updateDocumentMutation.mutate(content);
      }, 3000); // 3 second debounce
    },
    [documentId, updateDocumentMutation]
  );
  useEffect(() => {
    const signal = new AbortController();
    const editorId = documentId;
    let binding: QuillBinding;
    const tool = document.getElementById(toolbarId);
    if (!editorRef.current || !tool) return;

    // Initialize the Yjs document and text with awareness
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        history: editor_config.HISTORY_CONFIG,
        cursors: editor_config.ENABLE_CURSORS,
        toolbar: {
          container: `#${toolbarId}`,
          handlers: {
            bold: () => handleFormatChange("bold"),
            italic: () => handleFormatChange("italic"),
            underline: () => handleFormatChange("underline"),
            background: (value: string) => {
              const range = quill.getSelection();
              if (range) {
                quill.format("background", value, "user");
              }
            },
            headerN: (value: string | number | null) => {
              if (value === null) {
                quill.format("headerN", false, "user");
              } else {
                quill.format("headerN", value, "user");
              }
            },
            redo: () => {
              quill.history.redo();
            },
            undo: () => {
              quill.history.undo();
            },
            footnote: () => {
              const quill = quillRef.current;
              if (!quill) return;
              const module = quill.getModule("footnote");
              module.addFootnote("");
            },
          },
        },
        footnote: true,
        keyboard: {
          bindings: {
            ...footnoteKeyboardBindings,
            footnoteEsc: {
              key: "Escape",
              format: ["footnote-row"],
              handler: function (this: { quill: Quill }, range: any): boolean {
                const [line] = this.quill.getLine(range.index);
                if (line?.statics?.blotName === "footnote-row") {
                  const footnoteModule = this.quill.getModule(
                    "footnote"
                  ) as CustomFootnoteModule;

                  // delete the whole footnote row (pass the blot)
                  footnoteModule.deleteFootnote(line);

                  return false; // prevent default Escape behavior
                }

                return true;
              },
            },
          },
        },
        counter: {
          container: `#${counterId}`,
          unit: "character",
        },
      },
      readOnly: !isEditable,
      placeholder: t("editor.startCollaborating") as string,
      // className is not a valid Quill option, apply these styles to the container instead
    });

    registerQuill(quill);
    quillRef.current = quill;
    registerQuill2(editorId as string, quill);
    if (yText && provider) {
      console.log("yText and provider", yText, provider);
      binding = new QuillBinding(yText, quill, provider.awareness);
      provider.on("sync", (data) => {
        setIsSynced(data);
      });
    }

    quill?.root.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (EDITOR_ENTER_ONLY) {
          if (e.key !== "Enter") {
            e.preventDefault();
            e.stopPropagation();
          }
        }
        if (
          e.key === "space" ||
          e.key === "Enter" ||
          e.key === "Delete" ||
          e.key === "Backspace"
        ) {
          const footnotesInEditor =
            quill.root.querySelectorAll(".footnote-number");
          const footnoteIdsInEditor = Array.from(footnotesInEditor).map(
            (footnote) => footnote.id.split("-")[1]
          );
          const footnotesInFootnoteSection =
            quill.root.querySelectorAll(".footnote-row");
          // footnote that are present in footnote section and not in editor should be deleted check with there id footnote row contains id as footnote-row-[id]  and editor footnote contain footnote-id[]
          footnotesInFootnoteSection.forEach((footnote) => {
            const footnoteId = footnote.id.split("-row-")[1];
            if (!footnoteIdsInEditor.includes(footnoteId)) {
              footnote.remove();
            }
          });
        }
      },
      signal
    );
    // Fetch comments when the editor loads
    quill.on("text-change", (delta, oldDelta, source) => {
      if (source === "user") {
        const currentContent = quill.getLength() > 1 ? quill.getContents() : "";
        setTimeout(() => {
          debouncedSave(currentContent);
        }, 0);
      }
    });
    quill.on("selection-change", (range) => {
      if (!range) return;
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        const domrange = selection.getRangeAt(0);
        const rect = domrange.getBoundingClientRect();
        const { left, top } = rect;

        const lineNumber = getLineNumber(quill);
        const newRange = {
          ...range,
          left,
          top,
          lineNumber,
        };
        // You can use left and top coordinates for positioning elements
        setCurrentRange(newRange);
      }
    });

    function handleFormatChange(type: string) {
      const range = quill.getSelection();
      if (range) {
        const format = quill.getFormat(range);
        quill.format(type, !format[type], "user");
      } else {
        // If no selection, create one at cursor position
        quill.focus();
        const newRange = quill.getSelection(true);
        if (newRange) {
          const format = quill.getFormat(newRange);
          quill.format(type, !format[type], "user");
        }
      }
    }

    return () => {
      const currentContent = quill.getContents();
      updateDocumentMutation.mutate(currentContent);
      unregisterQuill2(editorId);
      queryClient.removeQueries({
        queryKey: [`document-${documentId}`],
      });
      signal.abort();
      quill.disable();
      binding?.destroy?.();
    };
  }, [isEditable, yText, provider]);

  //for non-realtime editor only

  useEffect(() => {
    const content = currentDoc?.currentVersion?.content?.ops || [];
    if (yText || provider) return () => {};
    if (
      quillRef.current &&
      quillRef.current.getText().trim() === "" &&
      content.length > 0
    ) {
      setTimeout(() => {
        quillRef.current?.setContents(content || []);
        setIsTibetan(checkIsTibetan(quillRef.current?.getText() || ""));
        // Set content loaded after a brief delay to ensure rendering is complete
      }, 0);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentDoc, yText, provider]);

  function addComment() {
    if (!currentRange || currentRange?.length === 0) return;

    setShowCommentModal(true);
  }

  const characterCount = quillRef.current?.getContents().length() || 0;
  if (!documentId) return null;
  return (
    <>
      {createPortal(
        <Toolbar
          addComment={addComment}
          synced={!isSaving || isSynced}
          documentId={documentId}
          toolbarId={toolbarId}
          range={currentRange}
          isEditable={isEditable}
          documentName={currentDoc?.name || undefined}
        />,
        document.getElementById("toolbar-container")!
      )}
      <div className="relative w-full flex flex-1 h-full overflow-hidden  ">
        <TableOfContent documentId={documentId} />

        <div className="editor-container w-full h-full flex flex-1  relative max-w-6xl mx-auto  ">
          {showLineNumbers && (
            <LineNumberVirtualized
              editorRef={editorRef}
              documentId={documentId}
            />
          )}
          <div className="flex flex-col flex-1 relative overflow-hidden">
            <div
              ref={editorRef}
              className={`editor-content flex-1 pb-1 w-full overflow-y-auto bg-editor-bg`}
              style={{
                fontFamily: isTibetan ? "Monlam" : "google-sans-regular",
                fontSize: isTibetan ? "1rem" : "1.3rem",
                lineHeight: 1.5,
              }}
            />

            {/* Skeleton Overlay */}
            {transitionPhase === "skeleton" && (
              <div className="absolute inset-0 bg-white z-10 p-4 overflow-y-auto">
                <SkeletonLoader className="version-skeleton-loader" />
              </div>
            )}
          </div>
          {createPortal(
            <div
              className="flex gap-1 items-center text-sm text-gray-500 px-2 dark:text-neutral-300 hover:text-gray-900"
              style={{
                background:
                  characterCount > MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION
                    ? "red"
                    : "transparent",
                color:
                  characterCount > MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION
                    ? "black"
                    : undefined,
              }}
              title={`${
                characterCount > MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION
                  ? `collaboration limit exceeded , max limit is ${MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION} characters`
                  : ""
              }`}
            >
              <div id={`${counterId}`} className="leading-[normal]">
                0
              </div>

              {t("editor.characters")}
            </div>,
            document.getElementById("counter")!
          )}

          {showCommentModal && (
            <CommentInitialize
              documentId={documentId}
              setShowCommentModal={setShowCommentModal}
              currentRange={currentRange}
            />
          )}
          <AnnotationList onVote={handleAnnotationVote} />
          <CommentBubble documentId={documentId} isEditable={isEditable} />
        </div>
        {/* <OverlayLoading isLoading={!isSynced} /> */}
      </div>
    </>
  );
};

export default memo(Editor);
