import {
  EditorView,
  keymap,
  Decoration,
  DecorationSet,
  ViewPlugin,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { completionKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import type { AnnotationRange } from "../types";

export const createFormatDecorationPlugin = (
  formatRangesRef: React.MutableRefObject<AnnotationRange[]>
) => {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
        this.decorations = this.buildDecorations(view);
      }

      update() {
        // Always rebuild decorations to keep them in sync with annotation changes
        // The isUserTyping check was causing decorations to not update during typing
        this.decorations = this.buildDecorations(this.view);
      }

      buildDecorations(view: EditorView): DecorationSet {
        const ranges: Array<
          ReturnType<ReturnType<typeof Decoration.mark>["range"]>
        > = [];

        try {
          // Use ref to get current formatRanges
          formatRangesRef.current.forEach((range) => {
            if (
              range.from >= 0 &&
              range.to <= view.state.doc.length &&
              range.from < range.to
            ) {
              let className = "";
              switch (range.type) {
                case "bold":
                  className = "format-bold";
                  break;
                case "italic":
                  className = "format-italic";
                  break;
                case "underline":
                  className = "format-underline";
                  break;
                default:
                  if (range.type.startsWith("h")) {
                    className = `format-${range.type}`;
                  }
                  break;
              }

              if (className) {
                const mark = Decoration.mark({ class: className });
                ranges.push(mark.range(range.from, range.to));
              }
            }
          });

          return Decoration.set(ranges);
        } catch (error) {
          console.error("Error building decorations:", error);
          return Decoration.set([]);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
};

export const createEditorTheme = () => {
  return EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "16px",
      fontFamily: "MonlamTBslim, serif",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
    },
    ".format-bold": {
      fontWeight: "bold",
    },
    ".format-italic": {
      fontStyle: "italic",
    },
    ".format-underline": {
      textDecoration: "underline",
    },
    ".format-h1": {
      fontSize: "2em",
      fontWeight: "bold",
      display: "block",
    },
    ".format-h2": {
      fontSize: "1.5em",
      fontWeight: "bold",
      display: "block",
    },
    ".format-h3": {
      fontSize: "1.2em",
      fontWeight: "bold",
      display: "block",
    },
    // Hide annotation markers from user view
    ".annotation-marker": {
      display: "none",
      fontSize: "0px",
      opacity: "0",
      position: "absolute",
      pointerEvents: "none",
    },
  });
};

export const createUpdateListener = (
  clearAnnotationsWhenEmpty: (isEmpty: boolean) => void,
  setCurrentContent: (content: string) => void,
  setHasUnsavedChanges: (hasChanges: boolean) => void,
  updateAnnotationRanges: (
    updater: (ranges: AnnotationRange[]) => AnnotationRange[]
  ) => void
) => {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString();
      const isEmpty = !content.trim();

      // Check if this is user input
      const isUserInput = update.transactions.some(
        (tr) =>
          tr.isUserEvent("input") ||
          tr.isUserEvent("input.type") ||
          tr.isUserEvent("input.paste") ||
          tr.isUserEvent("input.delete")
      );

      // Check if this is simple typing (single character input)
      const isSimpleTyping =
        isUserInput &&
        update.transactions.some((tr) => tr.isUserEvent("input.type")) &&
        update.changes.desc.length <= 2;

      console.log("🔄 Editor update:", {
        contentLength: content.length,
        isEmpty,
        isUserInput,
        isSimpleTyping,
      });

      // Clear annotations if content is empty and this is user input
      if (isUserInput && isEmpty) {
        console.log("🧹 Content deleted by user - clearing annotations");
        clearAnnotationsWhenEmpty(true);
      }

      // Note: Removed typing state optimization - decorations always rebuild now

      // Update annotation ranges based on text changes (simplified rich text editor behavior)
      if (isUserInput && update.changes.desc.length > 0) {
        updateAnnotationRanges((currentRanges) => {
          return currentRanges
            .map((range) => {
              let newFrom = range.from;
              let newTo = range.to;

              // Process each text change
              update.changes.iterChanges(
                (changeFrom, changeTo, replaceFrom, replaceTo) => {
                  const insertedLength = replaceTo - replaceFrom;
                  const deletedLength = changeTo - changeFrom;
                  const netChange = insertedLength - deletedLength;

                  // Case 1: Change is completely before the annotation
                  if (changeTo <= newFrom) {
                    // Shift the entire annotation
                    newFrom += netChange;
                    newTo += netChange;
                  }
                  // Case 2: Change is completely after the annotation
                  else if (changeFrom >= newTo) {
                    // No change needed
                  }
                  // Case 3: Change intersects with the annotation
                  else {
                    // If insertion/deletion is within the annotation, adjust end position
                    if (changeFrom >= newFrom && changeFrom <= newTo) {
                      newTo += netChange;
                    }
                    // If change starts before annotation, expand to include it
                    else if (changeFrom < newFrom) {
                      newFrom = changeFrom;
                      newTo += netChange;
                    }
                    // If change extends beyond annotation, expand to include it
                    else if (changeTo > newTo) {
                      newTo = replaceTo;
                    }
                  }
                }
              );

              // Ensure valid range and minimum content length
              newFrom = Math.max(0, newFrom);
              newTo = Math.max(newFrom, newTo);

              // If range becomes empty, keep minimum length or mark for removal
              if (newFrom >= newTo || newTo > update.state.doc.length) {
                return null; // Remove empty/invalid annotations
              }

              return {
                ...range,
                from: newFrom,
                to: newTo,
              };
            })
            .filter((range): range is AnnotationRange => range !== null);
        });
      }

      // Update content state for AutoSaveIndicator (but let it handle debouncing)
      if (isUserInput) {
        setCurrentContent(content);
        setHasUnsavedChanges(true);
      }
    }
  });
};

export const createCodeMirrorExtensions = (
  isEditable: boolean,
  formatRangesRef: React.MutableRefObject<AnnotationRange[]>,
  clearAnnotationsWhenEmpty: (isEmpty: boolean) => void,
  setCurrentContent: (content: string) => void,
  setHasUnsavedChanges: (hasChanges: boolean) => void,
  updateAnnotationRanges: (
    updater: (ranges: AnnotationRange[]) => AnnotationRange[]
  ) => void
) => {
  return [
    history(),
    EditorView.lineWrapping,
    createFormatDecorationPlugin(formatRangesRef),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    createEditorTheme(),
    createUpdateListener(
      clearAnnotationsWhenEmpty,
      setCurrentContent,
      setHasUnsavedChanges,
      updateAnnotationRanges
    ),
    EditorView.editable.of(isEditable),
  ];
};
