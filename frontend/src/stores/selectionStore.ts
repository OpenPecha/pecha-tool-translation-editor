import { create } from "zustand";
export type EditorId = string;

export interface Selection {
  startLine: number;
  range: {
    index: number;
    length: number;
  };
  text: string;
}

interface SelectionState {
  selections: Record<EditorId, Selection | null>;
  setManualSelection: (editorId: EditorId, selection: Selection) => void;
  setLineFocus: (editorId: EditorId, selection: Selection | null) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selections: {},
  setManualSelection: (editorId: EditorId, selection: Selection) =>
    set(state=>({
      selections: {
        ...state.selections,
        [editorId]: selection
      }
    })),
  setLineFocus: (
    editorId: EditorId,
    selection: Selection | null,
  ) =>
    set(state=>({
      selections: {
        ...state.selections,
        [editorId]: selection
      }
    })),
  clearSelections: () =>
    set({selections: {}})
}));
