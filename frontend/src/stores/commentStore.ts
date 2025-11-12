import { create } from "zustand";
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
}

export interface Thread {
  id: string;
  selectedText: string | null;
  comments: Comment[];
  initialStartOffset: number;
  initialEndOffset: number;
  isResolved: boolean;
}

type CommentStoreState = {
  threads: Thread[];
  sidebarView: "list" | "thread" | "new";
  activeThreadId: string | null;
  newCommentRange: {
    index: number;
    length: number;
    selectedText: string;
  } | null;
};

type CommentStoreActions = {
  setThreads: (threads: Thread[]) => void;
  openSidebar: (
    view: "list" | "thread" | "new",
    threadId?: string | null
  ) => void;
  closeSidebar: () => void;
  showListView: () => void;
  setActiveThreadId: (threadId: string | null) => void;
  setNewCommentRange: (
    range: { index: number; length: number; selectedText: string } | null
  ) => void;
  addCommentToThread: (threadId: string, comment: Comment) => void;
  updateCommentContent: (
    threadId: string,
    commentId: string,
    content: string
  ) => void;
  replaceComment: (
    threadId: string,
    tempId: string,
    newComment: Comment
  ) => void;
  removeComment: (threadId: string, commentId: string) => void;
};

export const useCommentStore = create<CommentStoreState & CommentStoreActions>(
  (set) => ({
    threads: [],
    sidebarView: "list",
    activeThreadId: null,
    newCommentRange: null,
    setThreads: (threads) => set({ threads }),
    openSidebar: (view: "list" | "thread" | "new", threadId: string | null = null) =>
      set({
        sidebarView: view,
        activeThreadId: threadId,
      }),
    closeSidebar: () =>
      set({ sidebarView: "list", activeThreadId: null }),
    showListView: () =>
      set({ sidebarView: "list", activeThreadId: null }),
    setActiveThreadId: (threadId) => set({ activeThreadId: threadId }),
    setNewCommentRange: (range) => set({ newCommentRange: range }),
    addCommentToThread: (threadId, comment) =>
      set((state) => ({
        threads: state.threads.map((thread) =>
          thread.id === threadId
            ? { ...thread, comments: [...thread.comments, comment] }
            : thread
        ),
      })),
    updateCommentContent: (threadId, commentId, content) =>
      set((state) => {
        return {
          threads: state.threads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: thread.comments.map((comment) =>
                    comment.id === commentId ? { ...comment, content } : comment
                  ),
                }
              : thread
          ),
        };
      }),
    replaceComment: (threadId, tempId, newComment) =>
      set((state) => ({
        threads: state.threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                comments: thread.comments.map((comment) =>
                  comment.id === tempId ? newComment : comment
                ),
              }
            : thread
        ),
      })),
    removeComment: (threadId, commentId) =>
      set((state) => ({
        threads: state.threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                comments: thread.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              }
            : thread
        ),
      })),
  })
);
