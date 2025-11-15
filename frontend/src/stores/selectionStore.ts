import { create } from "zustand";

export type EditorType = "source" | "translation";

export interface Selection {
  startLine: number;
  range: {
    index: number;
    length: number;
  };
  text: string;
  documentId?: string;
}

interface SelectionState {
  source: Selection | null;
  translation: Selection | null;
  setManualSelection: (editorType: EditorType, selection: Selection) => void;
  setLineFocus: (
    sourceSelection: Selection | null,
    translationSelection: Selection | null
  ) => void;
  clearSelections: () => void;
  getActiveEditorDocumentId: () => string | null;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  source: null,
  translation: null,

  setManualSelection: (editorType: EditorType, selection: Selection) =>
    set({
      [editorType]: selection,
      [editorType === "source" ? "translation" : "source"]: null,
    }),

  setLineFocus: (
    sourceSelection: Selection | null,
    translationSelection: Selection | null
  ) =>
    set({
      source: sourceSelection,
      translation: translationSelection,
    }),

  clearSelections: () =>
    set({
      source: null,
      translation: null,
    }),

  getActiveEditorDocumentId: () => {
    const state = get();
    // Check which editor has a selection (manual selection takes priority)
    if (state.source) {
      return state.source.documentId || null;
    }
    if (state.translation) {
      return state.translation.documentId || null;
    }
    return null;
  },
}));
