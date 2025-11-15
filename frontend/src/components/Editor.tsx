import Quill from "quill";
import { useCallback, useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar/Toolbar";
import "quill/dist/quill.snow.css";
import "quill-footnote/dist/quill-footnote.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { footnoteKeyboardBindings } from "quill-footnote";
import { createPortal } from "react-dom";
import { QuillBinding } from "y-quill";
import type * as Y from "yjs";
import { updateContentDocument } from "@/api/document";
import { useAuth } from "@/auth/use-auth-hook";
import { useEditor } from "@/contexts/EditorContext";
import type { Document } from "@/hooks/useCurrentDoc";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { checkIsTibetan } from "@/lib/isTibetan";
import {
  EDITOR_ENTER_ONLY,
  MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION,
  editor_config,
} from "@/utils/editorConfig";
import { useQuillVersion } from "../contexts/VersionContext";
import LineNumberVirtualized from "./LineNumbers";
import quill_import from "./quillExtension";
import type { CustomFootnoteModule } from "./quillExtension/CustomFootnote";
import SkeletonLoader from "./SkeletonLoader";
import AnnotationList from "./Annotation/AnnotationList";
import { handleAnnotationVote } from "./quill_func";
import DocumentSidebar from "./DocumentSidebar";
import { useCommentStore, type Thread } from "@/stores/commentStore";
import { useDocumentSidebarStore } from "@/stores/documentSidebarStore";
import { useQuery } from "@tanstack/react-query";
import { fetchThreadsByDocumentId } from "@/api/thread";
import emitter from "@/services/eventBus";
import { useQuillSelection } from "@/hooks/useQuillSelection";
import {
  useSelectionStore,
  type Selection,
  type EditorType,
} from "@/stores/selectionStore";

quill_import();

interface CustomRange {
  index: number;
  length: number;
  left: number;
  top: number;
  lineNumber: number | null;
}

const Editor = ({
  isTranslationEditor,
  documentId,
  isEditable,
  currentDoc,
  yText,
  provider,
  onManualSelect,
  onLineFocus,
}: {
  isTranslationEditor: boolean;
  documentId?: string;
  isEditable: boolean;
  currentDoc: Document;
  yText: Y.Text | undefined;
  provider: any | undefined;
  onManualSelect: (editorType: EditorType, selection: Selection) => void;
  onLineFocus: (lineNumber: number, editorType: EditorType) => void;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).slice(2, 6);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).slice(2, 6);
  const [currentRange, setCurrentRange] = useState<CustomRange | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const { registerQuill, transitionPhase } = useQuillVersion();
  const [isTibetan, setIsTibetan] = useState(false);
  const {
    registerQuill: registerQuill2,
    unregisterQuill: unregisterQuill2,
    setHoveredLineNumber,
    getLineNumber,
  } = useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const hasContentLoadedRef = useRef<boolean>(false);
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { openSidebar: openCommentSidebar, setNewCommentRange } =
    useCommentStore();
  const { setActiveTab } = useDocumentSidebarStore();
  const selection = useSelectionStore(
    (state) => state[isTranslationEditor ? "translation" : "source"]
  );

  useEffect(() => {
    if (selection) {
      const bounds = quillRef.current?.getBounds(
        selection.range.index,
        selection.range.length
      );
      setCurrentRange({
        index: selection.range.index,
        length: selection.range.length,
        left: bounds?.left || 0,
        top: bounds?.top || 0,
        lineNumber: selection.startLine,
      });
    } else {
      setCurrentRange(null);
    }
  }, [selection]);

  useQuillSelection({
    quill: quillRef.current || undefined,
    editorType: isTranslationEditor ? "translation" : "source",
    onManualSelect: (editorType, range) => {
      if (!quillRef.current || !documentId) return;
      const startLine = getLineNumber(quillRef.current);
      if (startLine === null) return;
      const text = quillRef.current.getText(range.index, range.length);
      onManualSelect(editorType, {
        startLine,
        range,
        text,
        documentId,
      });
    },
    onLineFocus: (range) => {
      if (!quillRef.current) return;
      function background_cleaner(){
        const allParagraphs = document.querySelectorAll(".ql-editor p");
        allParagraphs.forEach((p) => {
          p.classList.remove('focused_p');
        });
      }

      // Temporarily set selection to get line number, then restore
      const lineNumber = getLineNumber(quillRef.current);
     
      background_cleaner();
      if (lineNumber === null) return;
    
      onLineFocus(lineNumber, isTranslationEditor ? "translation" : "source");

      // Select the 3rd <a> tag within its parent and style it
      
      const selector = `.ql-editor p:nth-child(${lineNumber})`;
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
      el.classList.add('focused_p');
      });
    },
  });

  const { data: threads } = useQuery<Thread[]>({
    queryKey: ["threads", documentId],
    queryFn: () => fetchThreadsByDocumentId(documentId as string),
    enabled: !!documentId,
  });

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
        content: content.ops as any,
      }),
    onError: (error) => {
      console.error("Error updating document content:", error);
    },
    onSuccess: () => {
      // refetch versions
      queryClient.invalidateQueries({ queryKey: [`versions-${documentId}`] });
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
        if (!documentId || !hasContentLoadedRef.current) return;
        // Extra safety: Don't save if content is empty or nearly empty
        const contentOps = content?.ops as any[];
        if (!contentOps || contentOps.length === 0) return;
        
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
    const quill = new Quill(editorRef.current as HTMLDivElement, {
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
              const module = quill.getModule("footnote") as any;
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
      placeholder: t("editor.startTyping") as string,
      // className is not a valid Quill option, apply these styles to the container instead
    });

    registerQuill(quill);
    quillRef.current = quill;
    registerQuill2(editorId as string, quill);
    isInitializedRef.current = true;
    if (yText && provider) {
      binding = new QuillBinding(yText, quill, provider.awareness);
      provider.on("sync", (data: boolean) => {
        setIsSynced(data);
        // Mark content as loaded after sync
        if (data) {
          hasContentLoadedRef.current = true;
        }
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
    quill.on("text-change", (_delta, _oldDelta, source) => {

      if (source === "user" && hasContentLoadedRef.current) {


        const currentContent = quill.getLength() > 1 ? quill.getContents() : "";
        // Only save if there's actual content (prevent saving empty editor)
        if (currentContent?.length || 0 > 1) {
          debouncedSave(currentContent as any);
        }
      }
    });

    if (quillRef.current && threads) {
      threads.forEach((thread) => {
        quillRef.current!.formatText(
          thread.initialStartOffset,
          thread.initialEndOffset - thread.initialStartOffset,
          "comment",
          {
            id: thread.comments.length > 0 ? thread.comments[0].id : null,
            threadId: thread.id,
          }
        );
      });
    }

    const handleCommentClick = ({ threadId }: { threadId: string }) => {
      if (!threadId || !documentId) return;
      
      // Check if this thread belongs to this document using React Query data
      const threadExists = threads?.some(thread => thread.id === threadId);
      
      if (!threadExists) return; 
      setActiveTab(documentId, "comments");
      openCommentSidebar(documentId, "thread", threadId);
    };

    emitter.on("open-comment-thread", handleCommentClick as any);

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
      // Only save on unmount if content has been loaded and editor has actual content
      // This prevents saving empty content during hot reload
      if (hasContentLoadedRef.current && quill.getLength() > 1) {
        const currentContent = quill.getContents();
        updateDocumentMutation.mutate(currentContent as any);
      }
      emitter.off("open-comment-thread", handleCommentClick as any);
      if (editorId) {
        unregisterQuill2(editorId);
      }
      queryClient.removeQueries({
        queryKey: [`document-${documentId}`],
      });
      signal.abort();
      quill.disable();
      binding?.destroy?.();
      // Reset flags for next mount
      isInitializedRef.current = false;
      hasContentLoadedRef.current = false;
    };
  }, [isEditable, yText, provider]); // Add threads to dependency array

  //for non-realtime editor only

  useEffect(() => {
    const content = currentDoc?.currentVersion?.content?.ops || [];
    if (yText || provider) return () => {};
    if (
      quillRef.current &&
      quillRef.current.getText().trim() === "" &&
      content.length > 0
    ) {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
          quillRef.current?.setContents(content || []);
          setIsTibetan(checkIsTibetan(quillRef.current?.getText() || ""));
          // Mark content as loaded after setting initial content
          hasContentLoadedRef.current = true;
        });
      } else {
        setTimeout(() => {
          quillRef.current?.setContents(content || []);
          setIsTibetan(checkIsTibetan(quillRef.current?.getText() || ""));
          // Mark content as loaded after setting initial content
          hasContentLoadedRef.current = true;
        }, 0);
      }
    } else if (quillRef.current && quillRef.current.getText().trim() !== "") {
      // If editor already has content, mark it as loaded
      hasContentLoadedRef.current = true;
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentDoc, yText, provider]);

  // Hover synchronization between source and target editors
  useEffect(() => {
    if (!editorRef.current || !quillRef.current) return;

    const editorElement = editorRef.current.querySelector(".ql-editor");
    if (!editorElement) return;

    const calculateLineNumber = (element: HTMLElement): number | null => {
      const editorContainer = editorElement.closest(".editor-container");
      const lineNumbersContainer = editorContainer?.querySelector(".line-numbers");
      if (!lineNumbersContainer) return null;

      const rect = element.getBoundingClientRect();
      const editorRect = editorElement.getBoundingClientRect();
      const editorScrollTop = editorElement.scrollTop;
      const relativeTop = rect.top - editorRect.top + editorScrollTop;

      // Find the closest line number
      const lineNumberElements = Array.from(
        lineNumbersContainer.querySelectorAll(".line-number")
      );

      let closestLineNumber: number | null = null;
      let minDistance = Number.MAX_VALUE;

      for (const lineEl of lineNumberElements) {
        const lineTop = parseFloat((lineEl as HTMLElement).style.top);
        const distance = Math.abs(lineTop - relativeTop);

        if (distance < minDistance) {
          minDistance = distance;
          const spanElement = lineEl.querySelector("span");
          closestLineNumber = spanElement ? parseInt(spanElement.textContent || "0") : null;
        }
      }

      return closestLineNumber;
    };

    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.textContent?.trim()) {
        const lineNumber = calculateLineNumber(target);
        if (lineNumber !== null) {
          setHoveredLineNumber(lineNumber);
          
          // Apply hover class to all editors' text elements with the same line number
          const allEditorContainers = document.querySelectorAll(".editor-container");
          allEditorContainers.forEach((container) => {
            const lineNumberElement = container.querySelector(
              `.line-number[id$="-line-${lineNumber}"]`
            ) as HTMLElement;
            
            if (lineNumberElement) {
              const lineTop = parseFloat(lineNumberElement.style.top);
              const editorElement = container.querySelector(".ql-editor");
              
              if (editorElement) {
                const contentElements = editorElement.querySelectorAll(
                  "p, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20"
                );
                
                contentElements.forEach((element) => {
                  const rect = element.getBoundingClientRect();
                  const editorRect = editorElement.getBoundingClientRect();
                  const editorScrollTop = editorElement.scrollTop;
                  const elementTop = rect.top - editorRect.top + editorScrollTop;
                  
                  // Check if this element is at the same line number position
                  if (Math.abs(elementTop - lineTop) < 5) {
                    element.classList.add("editor-line-synced-hover");
                  }
                });
              }
            }
          });
        }
      }
    };

    const handleMouseLeave = () => {
      setHoveredLineNumber(null);
      
      // Remove hover class from all editors' text elements
      const allEditorContainers = document.querySelectorAll(".editor-container");
      allEditorContainers.forEach((container) => {
        const editorElement = container.querySelector(".ql-editor");
        if (editorElement) {
          const hoveredElements = editorElement.querySelectorAll(".editor-line-synced-hover");
          hoveredElements.forEach((element) => {
            element.classList.remove("editor-line-synced-hover");
          });
        }
      });
    };

    // Add event listeners to all content elements
    const contentElements = editorElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20");
    contentElements.forEach((element) => {
      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
    });

    // Use MutationObserver to handle dynamically added content
    const observer = new MutationObserver(() => {
      const newElements = editorElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20");
      newElements.forEach((element) => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);
      });
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      contentElements.forEach((element) => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
      });
      observer.disconnect();
      setHoveredLineNumber(null);
    };
  }, [documentId, setHoveredLineNumber]);
  const selectionStore = useSelectionStore((state) => {
    if (state.source?.documentId === documentId) return state.source;
    if (state.translation?.documentId === documentId) return state.translation;
    return null;
  });
  function addComment() {
    // Get the active editor's selection from selectionStore
    // Prioritize the current editor's selection, then fall back to the other editor
    const activeSelection = selectionStore;
    const activeDocumentId = documentId;
    
    if (!activeSelection || !activeSelection.range || activeSelection.range.length === 0 || !activeDocumentId) {
      return;
    }

    setNewCommentRange(activeDocumentId, {
      index: activeSelection.range.index,
      length: activeSelection.range.length,
      selectedText: activeSelection.text,
    });
    setActiveTab(activeDocumentId, "comments");
    openCommentSidebar(activeDocumentId, "new");
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
      <div className={`relative w-full flex flex-1 h-full overflow-hidden ${isTranslationEditor ? "flex-row-reverse" : ""}`}>
        <DocumentSidebar documentId={documentId} isTranslationEditor={isTranslationEditor} />

        <div className="editor-container w-full h-full flex flex-1  relative max-w-6xl mx-auto  ">
          {showLineNumbers && (
            <LineNumberVirtualized
              editorRef={editorRef as React.RefObject<HTMLDivElement>}
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
          <AnnotationList onVote={handleAnnotationVote} />
        </div>
        {/* <OverlayLoading isLoading={!isSynced} /> */}
      </div>
    </>
  );
};

export default Editor;
