import { useCallback } from "react";
import { EditorView } from "@codemirror/view";
import type { AnnotationRange } from "../types";

export const useFormatting = (
  view: EditorView | undefined,
  formatRanges: AnnotationRange[],
  setFormatRanges: (
    ranges: AnnotationRange[] | ((prev: AnnotationRange[]) => AnnotationRange[])
  ) => void,
  setCurrentContent: (content: string) => void,
  setHasUnsavedChanges: (hasChanges: boolean) => void
) => {
  // Apply formatting functions
  const applyFormatting = useCallback(
    (type: "bold" | "italic" | "underline") => {
      if (!view) return;

      const { from, to } = view.state.selection.main;
      if (from === to) return; // No selection

      const cleanContent = view.state.doc.toString();

      // Add new annotation directly to formatRanges (editor shows clean text)
      const newRange = {
        from,
        to,
        type,
      };
      const updatedAnnotations = [...formatRanges, newRange];
      setFormatRanges(updatedAnnotations);

      console.log("✨ Applied formatting", {
        type,
        from,
        to,
        selectedText: cleanContent.substring(from, to),
        totalAnnotations: updatedAnnotations.length,
        contentLength: cleanContent.length,
      });

      // Update content state for AutoSaveIndicator (will trigger debounced save)
      setCurrentContent(cleanContent);
      setHasUnsavedChanges(true);
    },
    [
      view,
      formatRanges,
      setFormatRanges,
      setCurrentContent,
      setHasUnsavedChanges,
    ]
  );

  const applyHeaderFormatting = useCallback(
    (level: number) => {
      if (!view) return;

      const selection = view.state.selection.main;
      const headerType = `h${level}`;

      // Find the line in the clean text
      const content = view.state.doc.toString();
      const lines = content.split("\n");
      let lineStart = 0;
      let currentLine = 0;

      // Calculate which line the cursor is on
      for (let i = 0; i < selection.head && currentLine < lines.length; i++) {
        if (content[i] === "\n") {
          currentLine++;
          lineStart = i + 1;
        }
      }

      const lineEnd = lineStart + (lines[currentLine]?.length || 0);

      // Remove any existing header formats that overlap with the current line
      const filteredRanges = formatRanges.filter((range) => {
        const isHeader = range.type.startsWith("h");
        const overlapsWithLine =
          (range.from >= lineStart && range.from <= lineEnd) ||
          (range.to >= lineStart && range.to <= lineEnd) ||
          (range.from <= lineStart && range.to >= lineEnd);

        return !(isHeader && overlapsWithLine);
      });

      // Add the new header format
      const newHeaderAnnotation = {
        from: lineStart,
        to: lineEnd,
        type: headerType,
      };

      const updatedAnnotations = [...filteredRanges, newHeaderAnnotation];

      setFormatRanges(updatedAnnotations);

      console.log("🎯 Applied header formatting", {
        level,
        headerType,
        lineStart,
        lineEnd,
        newAnnotation: newHeaderAnnotation,
        totalAnnotations: updatedAnnotations.length,
        allAnnotations: updatedAnnotations,
      });

      // Update content state for AutoSaveIndicator (will trigger debounced save)
      setCurrentContent(content);
      setHasUnsavedChanges(true);
    },
    [
      view,
      formatRanges,
      setFormatRanges,
      setCurrentContent,
      setHasUnsavedChanges,
    ]
  );

  // Toolbar handlers
  const handleBold = useCallback(
    () => applyFormatting("bold"),
    [applyFormatting]
  );
  const handleItalic = useCallback(
    () => applyFormatting("italic"),
    [applyFormatting]
  );
  const handleUnderline = useCallback(
    () => applyFormatting("underline"),
    [applyFormatting]
  );
  const handleHeader = useCallback(
    (level: number) => applyHeaderFormatting(level),
    [applyHeaderFormatting]
  );

  const addComment = useCallback(() => console.log("Add comment"), []);
  const addFootnote = useCallback(() => console.log("Add footnote"), []);

  return {
    handleBold,
    handleItalic,
    handleUnderline,
    handleHeader,
    addComment,
    addFootnote,
  };
};
