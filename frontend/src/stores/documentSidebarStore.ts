import { create } from "zustand";

type DocumentSidebarState = {
  // Map of documentId -> activeTab
  activeTabs: Record<string, string | null>;
  setActiveTab: (documentId: string, tabId: string | null) => void;
  toggleTab: (documentId: string, tabId: string) => void;
  getActiveTab: (documentId: string) => string | null;
};

export const useDocumentSidebarStore = create<DocumentSidebarState>((set, get) => ({
  activeTabs: {},
  getActiveTab: (documentId: string) => {
    return get().activeTabs[documentId] ?? null;
  },
  setActiveTab: (documentId: string, tabId: string | null) => {
    set((state) => ({
      activeTabs: {
        ...state.activeTabs,
        [documentId]: tabId,
      },
    }));
  },
  toggleTab: (documentId: string, tabId: string) => {
    const { activeTabs } = get();
    const currentTab = activeTabs[documentId] ?? null;
    set({
      activeTabs: {
        ...activeTabs,
        [documentId]: currentTab === tabId ? null : tabId,
      },
    });
  },
}));
