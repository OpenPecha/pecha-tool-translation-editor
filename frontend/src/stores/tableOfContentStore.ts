import { create } from "zustand";

interface TableOfContentState {
  synced: boolean;
  setSynced: (synced: boolean) => void;
}

export const useTableOfContentStore = create<TableOfContentState>((set) => ({
  synced: false,
  setSynced: (synced) => set({ synced }),
}));
