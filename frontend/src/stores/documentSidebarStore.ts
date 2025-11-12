import { create } from "zustand";

type DocumentSidebarState = {
  activeTab: string | null;
  setActiveTab: (tabId: string | null) => void;
  toggleTab: (tabId: string) => void;
};

export const useDocumentSidebarStore = create<DocumentSidebarState>((set, get) => ({
  activeTab: null,
  setActiveTab: (tabId) => set({ activeTab: tabId }),
  toggleTab: (tabId: string) => {
    const { activeTab } = get();
    set({ activeTab: activeTab === tabId ? null : tabId });
  },
}));
