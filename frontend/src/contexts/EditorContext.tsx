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
  getQuill: (id: string) => Quill | undefined;
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
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;
