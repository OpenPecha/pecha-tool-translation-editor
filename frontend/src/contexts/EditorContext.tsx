import React, { createContext, useContext, useState } from "react";
import Quill from "quill";

interface EditorContextType {
  activeEditor: string | null;
  setActiveEditor: (id: string) => void;
  activeQuill: Quill | null;
  setActiveQuill: (quill: Quill | null) => void;
  quillEditors: Map<string, Quill>;
  registerQuill: (id: string, quill: Quill) => void;
  unregisterQuill: (id: string) => void;
  getQuill: (id: string) => Quill | null;
  getLineNumber: (quill: Quill | null) => number | null;
  getElementWithLinenumber: (
    quill: Quill | null,
    line_number: number
  ) => HTMLElement | null;
  getSelectionLineNumbers: () => Record<string, { from: number; to: number }> | null;
  scrollToLineNumber: (line_number: number, quill?: Quill | null) => boolean;
}

const EditorContext = createContext<EditorContextType>({
  activeEditor: null,
  setActiveEditor: () => {},
  activeQuill: null,
  setActiveQuill: () => {},
  quillEditors: new Map(),
  registerQuill: (id: string) => {},
  unregisterQuill: (id: string) => {},
  getQuill: () => null,
  getLineNumber: () => null,
  getElementWithLinenumber: () => null,
  getSelectionLineNumbers: () => null,
  scrollToLineNumber: () => false,
});

export const useEditor = () => useContext(EditorContext);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [activeQuill, setActiveQuill] = useState<Quill | null>(null);
  const [quillEditors, setQuillEditors] = useState<Map<string, Quill>>(
    new Map()
  );
  const registerQuill = (id: string, quill: Quill) => {
    setQuillEditors((prev) => {
      const next = new Map(prev);
      next.set(id, quill);
      return next;
    });

    // Set up focus tracking
    setActiveEditor(id);
    quill.on("selection-change", (range) => {
      if (range) {
        setActiveEditor(id);
        setActiveQuill(quill);
      }
    });
  };

  const unregisterQuill = (id: string) => {
    setQuillEditors((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    if (activeEditor === id) {
      setActiveEditor(null);
      setActiveQuill(null);
    }
    if (quillEditors.size > 0) {
      setActiveEditor(Array.from(quillEditors.keys())[0]);
    }
  };

  const getQuill = (id: string): Quill | null => {
    return quillEditors.get(id) ?? null;
  };

  const getLineNumber = (quill: Quill | null) => {
    if (!quill) return null;

    const range = quill.getSelection();
    if (!range) return null;

    const editorDiv = quill.root;
    const editorElement = editorDiv;
    if (!editorElement) return null;

    // Get the selection's position
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const domRange = selection.getRangeAt(0);
    const clickedElement = domRange.startContainer.parentElement;

    // Check if the clicked element is empty or is a div
    if (
      clickedElement &&
      (!clickedElement.textContent?.trim() ||
        clickedElement.tagName.toLowerCase() === "div")
    ) {
      return null;
    }

    const rect = domRange.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop;

    // Calculate the relative position in the editor
    const relativePosition = rect.top - editorRect.top + editorScrollTop;

    const sourceContainer = editorDiv.closest(".editor-container");
    const sourceLineNumbersContainer =
      sourceContainer?.querySelector(".line-numbers");
    if (!sourceLineNumbersContainer) return null;

    // Find the line number element that is closest to the selection's position
    const lineNumberElements = Array.from(
      sourceLineNumbersContainer.querySelectorAll(".line-number")
    );

    let closestLineElement: HTMLElement | null = null;
    let minDistance = Number.MAX_VALUE;

    for (const lineEl of lineNumberElements) {
      const lineTop = parseFloat((lineEl as HTMLElement).style.top);
      const distance = Math.abs(lineTop - relativePosition);

      if (distance < minDistance) {
        minDistance = distance;
        closestLineElement = lineEl as HTMLElement;
      }
    }

    if (!closestLineElement) return null;

    const spanElement = closestLineElement.querySelector("span");
    return spanElement ? parseInt(spanElement.textContent || "0") : null;
  };

  const getElementWithLinenumber = (
    quill: Quill | null,
    line_number: number
  ): HTMLElement | null => {
    if (!quill) return null;

    const editorDiv = quill.root;
    const editorElement = editorDiv;
    if (!editorElement) return null;

    const sourceContainer = editorDiv.closest(".editor-container");
    const sourceLineNumbersContainer =
      sourceContainer?.querySelector(".line-numbers");
    if (!sourceLineNumbersContainer) return null;

    // Find the line number element with the specified number in the other editor
    const lineNumberElement = sourceLineNumbersContainer.querySelector(
      `.line-number[id$="-line-${line_number}"]`
    );
    if (!lineNumberElement) return null;

    // Get the top position of the line number
    const lineTop = parseFloat((lineNumberElement as HTMLElement).style.top);
    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop;

    // Calculate the absolute position in the editor
    const absolutePosition = lineTop + editorRect.top - editorScrollTop;

    // Find the element at this position in the other editor
    const elements = Array.from(
      editorElement.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, div")
    );
    const elementAtPosition = elements.find((el) => {
      const rect = el.getBoundingClientRect();
      return Math.abs(rect.top - absolutePosition) < 5; // 5px tolerance
    });

    return elementAtPosition as HTMLElement | null;
  };

  const getSelectionLineNumbers = (): Record<string, { from: number; to: number }> | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return null;

    // Find which editor this selection belongs to
    let targetQuill: Quill | null = null;
    let editorContainer: Element | null = null;

    const container = range.commonAncestorContainer;
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    
    while (element) {
      if (element.classList?.contains("ql-editor")) {
        editorContainer = element.closest(".editor-container");
        break;
      }
      element = element.parentElement;
    }

    if (!editorContainer) return null;

    // Find the corresponding Quill instance
    for (const [, quill] of quillEditors) {
      if (quill.root.closest(".editor-container") === editorContainer) {
        targetQuill = quill;
        break;
      }
    }

    if (!targetQuill) return null;

    const sourceLineNumbersContainer = editorContainer.querySelector(".line-numbers");
    if (!sourceLineNumbersContainer) return null;

    const editorElement = targetQuill.root;
    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop;

    // Get line number elements
    const lineNumberElements = Array.from(
      sourceLineNumbersContainer.querySelectorAll(".line-number")
    );

    if (lineNumberElements.length === 0) return null;

    // Split the selected text into lines (for future use if needed)
    // const selectedLines = selectedText.split('\n');
    const result: Record<string, { from: number; to: number }> = {};

    // Get the start and end positions of the selection in the DOM
    const startRect = range.startContainer.nodeType === Node.TEXT_NODE 
      ? (() => {
          const tempRange = document.createRange();
          tempRange.setStart(range.startContainer, range.startOffset);
          tempRange.setEnd(range.startContainer, range.startOffset);
          return tempRange.getBoundingClientRect();
        })()
      : range.getBoundingClientRect();

    const endRect = range.endContainer.nodeType === Node.TEXT_NODE 
      ? (() => {
          const tempRange = document.createRange();
          tempRange.setStart(range.endContainer, range.endOffset);
          tempRange.setEnd(range.endContainer, range.endOffset);
          return tempRange.getBoundingClientRect();
        })()
      : range.getBoundingClientRect();

    const startRelativePosition = startRect.top - editorRect.top + editorScrollTop;
    const endRelativePosition = endRect.top - editorRect.top + editorScrollTop;

    // Find line numbers that intersect with the selection
    let startLineNumber: number | null = null;
    let endLineNumber: number | null = null;

    for (const lineEl of lineNumberElements) {
      const lineTop = parseFloat((lineEl as HTMLElement).style.top);
      const spanElement = lineEl.querySelector("span");
      const lineNumber = spanElement ? parseInt(spanElement.textContent || "0") : 0;

      if (!startLineNumber && lineTop <= startRelativePosition + 10) {
        startLineNumber = lineNumber;
      }
      
      if (lineTop <= endRelativePosition + 10) {
        endLineNumber = lineNumber;
      }
    }

    if (!startLineNumber || !endLineNumber) return null;

    // We need to calculate character positions within each line, not cumulative
    // First, let's get the actual selection range within the Quill editor
    const quillRange = targetQuill.getSelection();
    if (!quillRange) return null;

    // Get the full text of the editor to work with line positions
    const fullText = targetQuill.getText();
    const fullTextLines = fullText.split('\n');

    // Calculate which part of each line is selected
    const selectionStart = quillRange.index;
    const selectionEnd = quillRange.index + quillRange.length;

    let currentIndex = 0;
    let currentLineNumber = 1;

    for (let lineIndex = 0; lineIndex < fullTextLines.length; lineIndex++) {
      const lineText = fullTextLines[lineIndex];
      const lineStart = currentIndex;
      const lineEnd = currentIndex + lineText.length;

      // Skip empty lines (similar to getLineNumber logic)
      if (!lineText.trim()) {
        currentIndex = lineEnd + 1; // +1 for the newline character
        continue; // Don't increment currentLineNumber for empty lines
      }

      // Check if this line intersects with our selection
      if (lineStart < selectionEnd && lineEnd >= selectionStart) {
        // Calculate the intersection
        const selectionStartInLine = Math.max(0, selectionStart - lineStart);
        const selectionEndInLine = Math.min(lineText.length, selectionEnd - lineStart);

        if (selectionStartInLine < selectionEndInLine) {
          result[currentLineNumber.toString()] = {
            from: selectionStartInLine,
            to: selectionEndInLine
          };
        }
      }

      currentIndex = lineEnd + 1; // +1 for the newline character
      currentLineNumber++;

      // Break if we've passed the selection
      if (currentIndex > selectionEnd) break;
    }

    return Object.keys(result).length > 0 ? result : null;
  };

  const scrollToLineNumber = (line_number: number, quill?: Quill | null): boolean => {
    // If specific quill provided, only scroll that one
    if (quill) {
      return scrollSingleEditor(quill, line_number);
    }

    // Otherwise scroll all editors
    let success = false;
    quillEditors.forEach((editor) => {
      if (scrollSingleEditor(editor, line_number)) {
        success = true;
      }
    });
    return success;
  };

  // Helper function to scroll a single editor
  const scrollSingleEditor = (quill: Quill, line_number: number): boolean => {
    const editorElement = quill.root;
    const editorContainer = editorElement.closest(".editor-container");
    if (!editorContainer) return false;

    const lineNumbersContainer = editorContainer.querySelector(".line-numbers");
    if (!lineNumbersContainer) return false;

    // Find the line number element for the target line
    const targetLineElement = lineNumbersContainer.querySelector(
      `.line-number[id$="-line-${line_number}"]`
    ) as HTMLElement;
    
    if (!targetLineElement) return false;

    // Get the top position of the line and scroll to it
    const lineTop = parseFloat(targetLineElement.style.top);
    editorElement.scrollTo({
      top: lineTop - 50, // Add small offset for better visibility
      behavior: "smooth",
    });

    // Add visual feedback - highlight and blink the line number
    highlightLineNumber(targetLineElement);

    return true;
  };

  // Helper function to add visual feedback to the line number
  const highlightLineNumber = (lineElement: HTMLElement) => {
    const spanElement = lineElement.querySelector("span");
    if (!spanElement) return;

    // Remove any existing highlight classes
    spanElement.classList.remove("line-highlight", "line-blink");
    
    // Store original styles
    const originalBackgroundColor = spanElement.style.backgroundColor;
    const originalColor = spanElement.style.color;
    const originalTransition = spanElement.style.transition;

    // Apply initial highlight
    spanElement.style.transition = "all 0.2s ease-in-out";
    spanElement.style.backgroundColor = "#3b82f6"; // Blue background
    spanElement.style.color = "#ffffff"; // White text
    spanElement.style.transform = "scale(1.1)";
    spanElement.style.borderRadius = "4px";
    spanElement.style.padding = "2px 4px";
    spanElement.style.fontWeight = "bold";

    // Create blinking effect
    let blinkCount = 0;
    const maxBlinks = 3;
    const blinkInterval = setInterval(() => {
      if (blinkCount >= maxBlinks) {
        clearInterval(blinkInterval);
        // Fade back to original state
        spanElement.style.transition = "all 0.3s ease-out";
        spanElement.style.backgroundColor = originalBackgroundColor;
        spanElement.style.color = originalColor;
        spanElement.style.transform = "scale(1)";
        spanElement.style.borderRadius = "";
        spanElement.style.padding = "";
        spanElement.style.fontWeight = "";
        
        // Clean up after animation
        setTimeout(() => {
          spanElement.style.transition = originalTransition;
        }, 300);
        return;
      }

      // Toggle between highlight and slightly dimmed
      if (blinkCount % 2 === 0) {
        spanElement.style.backgroundColor = "#1d4ed8"; // Darker blue
        spanElement.style.transform = "scale(1.05)";
      } else {
        spanElement.style.backgroundColor = "#3b82f6"; // Original blue
        spanElement.style.transform = "scale(1.1)";
      }
      blinkCount++;
    }, 200);
  };

  return (
    <EditorContext.Provider
      value={{
        activeEditor,
        setActiveEditor,
        activeQuill,
        setActiveQuill,
        quillEditors,
        registerQuill,
        unregisterQuill,
        getQuill,
        getLineNumber,
        getElementWithLinenumber,
        getSelectionLineNumbers,
        scrollToLineNumber,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;
