import { useCallback, useEffect, useState } from "react";
import { useEditor } from "@/contexts/EditorContext";
import { isEqual } from "lodash";

export const useTextSelection = () => {
  const [selectedText, setSelectedText] = useState<string>("");
  const [activeSelectedEditor, setActiveSelectedEditor] = useState<
    string | null
  >(null);
  const [selectedTextLineNumbers, setSelectedTextLineNumbers] = useState<Record<
    string,
    { from: number; to: number }
  > | null>(null);

  const {
    getSelectionLineNumbers,
    activeEditor,
    quillEditors,
    getQuill,
    getTextByLineNumber,
  } = useEditor();

  // Function to get selected text from the DOM (only from main editor)
  const getSelectedText = useCallback(() => {
    const selection = globalThis.getSelection();
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
  }, []);

  // Monitor text selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const text = getSelectedText();
      const lineNumbers = text ? getSelectionLineNumbers() : null;

      // Update state only if text or line numbers have actually changed
      setSelectedText((prevText) => {
        if (text !== prevText) {
          return text;
        }
        return prevText;
      });

      setSelectedTextLineNumbers((prevLineNumbers) => {
        if (!isEqual(lineNumbers, prevLineNumbers)) {
          return lineNumbers;
        }
        return prevLineNumbers;
      });

      if (text) {
        setActiveSelectedEditor(activeEditor);
      } else {
        setActiveSelectedEditor(null);
      }
    };

    // Add event listener for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [activeEditor, getSelectedText, getSelectionLineNumbers]);

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

  const getTranslatedTextForLine = (lineNumber: number): string | null => {
    if (!activeEditor || quillEditors.size < 2) {
      return null;
    }

    let otherEditorId: string | null = null;
    for (const editorId of quillEditors.keys()) {
      if (editorId !== activeEditor) {
        otherEditorId = editorId;
        break;
      }
    }

    if (!otherEditorId) {
      return null;
    }

    const otherEditorQuill = getQuill(otherEditorId);
    return getTextByLineNumber(otherEditorQuill, lineNumber);
  };

  const getOriginalTextForLine = (lineNumber: number): string | null => {
    if (!activeEditor) {
      return null;
    }
    const quill = getQuill(activeEditor);
    return getTextByLineNumber(quill, lineNumber);
  };

  const getTextPairsByLineNumbers = (): Array<{
    original_text: string;
    translated_text: string;
  }> | null => {
    if (!selectedTextLineNumbers) {
      return null;
    }
    const lineNumbers = Object.keys(selectedTextLineNumbers).map(Number);
    const textPairs = [];
    for (const lineNumber of lineNumbers) {
      const originalText = getOriginalTextForLine(lineNumber);
      const translatedText = getTranslatedTextForLine(lineNumber);
      if (originalText && translatedText) {
        textPairs.push({
          original_text: originalText,
          translated_text: translatedText,
        });
      }
    }
    return textPairs;
  };

  return {
    selectedText,
    activeSelectedEditor,
    selectedTextLineNumbers,
    clearSelection,
    clearUISelection,
    getTranslatedTextForLine,
    getOriginalTextForLine,
    getTextPairsByLineNumbers,
  };
};
