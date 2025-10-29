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
    // Get the first editor from quillEditors map, if it exists
    const firstQuillEntry =
      quillEditors && quillEditors.size > 0
        ? Array.from(quillEditors.values())[0]
        : null;
    const EditorElement = firstQuillEntry?.root;
    const selection = globalThis.getSelection();

    if (
      selection &&
      selection.rangeCount > 0 &&
      EditorElement &&
      selection.toString().trim()
    ) {
      const range = selection.getRangeAt(0);

      // Only allow selection if both endpoints are inside the EditorElement
      if (
        EditorElement.contains(range.startContainer) &&
        EditorElement.contains(range.endContainer)
      ) {
        return selection.toString().trim();
      }
    }
    return "";
  }, [activeEditor, quillEditors]);

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
