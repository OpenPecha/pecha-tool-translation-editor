import { useState, useEffect } from "react";
import { useEditor } from "@/contexts/EditorContext";

export const useTextSelection = () => {
  const [selectedText, setSelectedText] = useState<string>("");
  const [activeSelectedEditor, setActiveSelectedEditor] = useState<string | null>(null);
  const [selectedTextLineNumbers, setSelectedTextLineNumbers] = useState<Record<
    string,
    { from: number; to: number }
  > | null>(null);

  const { getSelectionLineNumbers, activeEditor } = useEditor();

  // Function to get selected text from the DOM (only from main editor)
  const getSelectedText = () => {
    const selection = window.getSelection();
    if (selection?.toString().trim()) {
      // Check if selection is from the main editor (not from sidebar or other elements)
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Find the closest editor container
      let element =
        container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : (container as Element);
      while (element) {
        // Look for editor-specific classes or data attributes
        if (
          element.classList?.contains("ql-editor") ||
          element.classList?.contains("ProseMirror") ||
          element.closest(".editor-container") ||
          element.closest('[data-editor="main"]')
        ) {
          return selection.toString().trim();
        }
        // Don't allow selection from translation sidebar
        if (element.closest("[data-translation-sidebar]")) {
          return "";
        }
        element = element.parentElement;
      }
    }
    return "";
  };

  // Monitor text selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const text = getSelectedText();
      if (!text || text.length === 0) {
        return;
      }
      setSelectedText(text);
      setActiveSelectedEditor(activeEditor);

      // Get line number information for the selected text
      if (text) {
        const lineNumbers = getSelectionLineNumbers();
        setSelectedTextLineNumbers(lineNumbers);
      } else {
        setSelectedTextLineNumbers(null);
      }
    };

    // Add event listener for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Initial check
    handleSelectionChange();

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [getSelectionLineNumbers, activeEditor]);

  const clearSelection = () => {
    setSelectedText("");
    setActiveSelectedEditor(null);
    setSelectedTextLineNumbers(null);
  };

  const clearUISelection = () => {
    // Clear only the visual selection, keep line numbers for replace functionality
    setSelectedText("");
    setActiveSelectedEditor(null);
    // Keep selectedTextLineNumbers intact
  };

  return {
    selectedText,
    activeSelectedEditor,
    selectedTextLineNumbers,
    clearSelection,
    clearUISelection,
  };
};
