import React, { createContext, useContext, useRef, useState } from "react";
import Quill from "quill";

interface EditorContextType {
  activeEditor: string | null;
  setActiveEditor: (id: string) => void;
  activeQuill: Quill | null;
  setActiveQuill: (quill: Quill | null) => void;
  quillEditors: Map<string, Quill>;
  registerQuill: (id: string, quill: Quill) => void;
  unregisterQuill: (id: string) => void;
  getQuill: (id: string) => Quill | undefined;
  getLineNumber: (quill: Quill | null) => number | null;
  getElementWithLinenumber: (
    quill: Quill | null,
    line_number: number
  ) => HTMLElement | null;
}

const EditorContext = createContext<EditorContextType>({
  activeEditor: null,
  setActiveEditor: () => {},
  activeQuill: null,
  setActiveQuill: () => {},
  quillEditors: new Map(),
  registerQuill: (id: string) => {},
  unregisterQuill: (id: string) => {},
  getQuill: () => undefined,
  getLineNumber: () => null,
  getElementWithLinenumber: () => null,
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
  const lastClickY = useRef<number | null>(null);
  const registerQuill = (id: string, quill: Quill) => {
    setQuillEditors((prev) => {
      const next = new Map(prev);
      next.set(id, quill);
      return next;
    });

    // Set up focus tracking
    setActiveEditor(id);
    quill.on("selection-change", (range, oldRange, source) => {
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
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;
