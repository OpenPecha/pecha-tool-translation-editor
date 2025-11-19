import { create } from "zustand";

type EditorSidebarState = {
  tabs: Record<string, string | null>;
  setTabs: (documentId: string, tabId: string | null) => void;
  toggleTab: (documentId: string, tabId: string) => void;
};

export const useEditorSidebarStore = create<EditorSidebarState>((set, get) => ({
 tabs: {},
 setTabs: (documentId: string, tabId: string | null) => {
  set((state) => ({
    tabs: {
      ...state.tabs,
      [documentId]: tabId,
    },
  }));
 },
 toggleTab: (documentId: string, tabId: string) => {
  set((state) => {
    const currentTab = state.tabs[documentId];
    const newTab = currentTab === tabId ? null : tabId;
    return {
      tabs: {
        ...state.tabs,
        [documentId]: newTab,
      },
    };
  });  
 },
}));
