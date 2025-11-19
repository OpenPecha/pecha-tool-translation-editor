import { create } from "zustand";
export interface CommentReference {
  name: string;
  type: string;
  content: string;
  id: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    picture?: string;
  };
  threadId: string | null;
  isSystemGenerated: boolean;
  references?: CommentReference[];
}

export interface Thread {
  id: string;
  selectedText: string | null;
  initialStartOffset: number;
  initialEndOffset: number;
  isResolved: boolean;
}

type CommentStoreState = {
  sidebarViews: Record<string, "list" | "thread" | "new">;
  activeThreadIds: Record<string, string | null>;
};

type CommentStoreActions = {
  getSidebarView: (documentId: string) => "list" | "thread" | "new";
  setSidebarView: (documentId: string, view: "list" | "thread" | "new") => void;
  getActiveThreadId: (documentId: string) => string | null;
  setActiveThreadId: (documentId: string, threadId: string | null) => void;
};

export const useCommentStore = create<CommentStoreState & CommentStoreActions>(
  (set, get) => ({
    sidebarViews: {},
    activeThreadIds: {},
    getSidebarView: (documentId: string) => {
      return get().sidebarViews[documentId] ?? "list";
    },
    getActiveThreadId: (documentId: string) => {
      return get().activeThreadIds[documentId] ?? null;
    },
    setActiveThreadId: (documentId: string, threadId: string | null) => {
      set((state) => ({
        activeThreadIds: {
          ...state.activeThreadIds,
          [documentId]: threadId,
        },
      }));
    },
    setSidebarView: (documentId: string, view: "list" | "thread" | "new") => {
      set((state) => ({
        sidebarViews: {
          ...state.sidebarViews,
          [documentId]: view,
        },
      }));
    },
  })
);
