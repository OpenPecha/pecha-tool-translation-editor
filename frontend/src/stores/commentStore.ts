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
  comments: Comment[];
  initialStartOffset: number;
  initialEndOffset: number;
  isResolved: boolean;
}

type CommentStoreState = {
  threadsByDocument: Record<string, Thread[]>;
  sidebarViews: Record<string, "list" | "thread" | "new">;
  activeThreadIds: Record<string, string | null>;
  newCommentRanges: Record<
    string,
    {
      index: number;
      length: number;
      selectedText: string;
    } | null
  >;
};

type CommentStoreActions = {
  getThreads: (documentId: string) => Thread[];
  setThreads: (documentId: string, threads: Thread[]) => void;
  getSidebarView: (documentId: string) => "list" | "thread" | "new";
  openSidebar: (
    documentId: string,
    view: "list" | "thread" | "new",
    threadId?: string | null
  ) => void;
  closeSidebar: (documentId: string) => void;
  showListView: (documentId: string) => void;
  getActiveThreadId: (documentId: string) => string | null;
  setActiveThreadId: (documentId: string, threadId: string | null) => void;
  getNewCommentRange: (documentId: string) => {
    index: number;
    length: number;
    selectedText: string;
  } | null;
  setNewCommentRange: (
    documentId: string,
    range: { index: number; length: number; selectedText: string } | null
  ) => void;
  addCommentToThread: (
    documentId: string,
    threadId: string,
    comment: Comment
  ) => void;
  updateCommentContent: (
    documentId: string,
    threadId: string,
    commentId: string,
    content: string
  ) => void;
  replaceComment: (
    documentId: string,
    threadId: string,
    tempId: string,
    newComment: Comment
  ) => void;
  removeComment: (
    documentId: string,
    threadId: string,
    commentId: string
  ) => void;
};

export const useCommentStore = create<CommentStoreState & CommentStoreActions>(
  (set, get) => ({
    threadsByDocument: {},
    sidebarViews: {},
    activeThreadIds: {},
    newCommentRanges: {},
    getThreads: (documentId: string) => {
      return get().threadsByDocument[documentId] ?? [];
    },
    setThreads: (documentId: string, threads: Thread[]) =>
      set((state) => ({
        threadsByDocument: {
          ...state.threadsByDocument,
          [documentId]: threads,
        },
      })),
    getSidebarView: (documentId: string) => {
      return get().sidebarViews[documentId] ?? "list";
    },
    openSidebar: (
      documentId: string,
      view: "list" | "thread" | "new",
      threadId: string | null = null
    ) =>
      set((state) => ({
        sidebarViews: {
          ...state.sidebarViews,
          [documentId]: view,
        },
        activeThreadIds: {
          ...state.activeThreadIds,
          [documentId]: threadId,
        },
      })),
    closeSidebar: (documentId: string) =>
      set((state) => ({
        sidebarViews: {
          ...state.sidebarViews,
          [documentId]: "list",
        },
        activeThreadIds: {
          ...state.activeThreadIds,
          [documentId]: null,
        },
      })),
    showListView: (documentId: string) =>
      set((state) => ({
        sidebarViews: {
          ...state.sidebarViews,
          [documentId]: "list",
        },
        activeThreadIds: {
          ...state.activeThreadIds,
          [documentId]: null,
        },
      })),
    getActiveThreadId: (documentId: string) => {
      return get().activeThreadIds[documentId] ?? null;
    },
    setActiveThreadId: (documentId: string, threadId: string | null) =>
      set((state) => ({
        activeThreadIds: {
          ...state.activeThreadIds,
          [documentId]: threadId,
        },
      })),
    getNewCommentRange: (documentId: string) => {
      return get().newCommentRanges[documentId] ?? null;
    },
    setNewCommentRange: (
      documentId: string,
      range: { index: number; length: number; selectedText: string } | null
    ) =>
      set((state) => ({
        newCommentRanges: {
          ...state.newCommentRanges,
          [documentId]: range,
        },
      })),
    addCommentToThread: (documentId: string, threadId: string, comment: Comment) =>{
      set((state) => ({
        threadsByDocument: {
          ...state.threadsByDocument,
          [documentId]: (state.threadsByDocument[documentId] ?? []).map(
            (thread) =>
              thread.id === threadId
                ? { ...thread, comments: [...thread.comments, comment] }
                : thread
          ),
        },
      }))},
    updateCommentContent: (
      documentId: string,
      threadId: string,
      commentId: string,
      content: string
    ) =>
      set((state) => ({
        threadsByDocument: {
          ...state.threadsByDocument,
          [documentId]: (state.threadsByDocument[documentId] ?? []).map(
            (thread) =>
              thread.id === threadId
                ? {
                    ...thread,
                    comments: thread.comments.map((comment) =>
                      comment.id === commentId
                        ? { ...comment, content }
                        : comment
                    ),
                  }
                : thread
          ),
        },
      })),
    replaceComment: (
      documentId: string,
      threadId: string,
      tempId: string,
      newComment: Comment
    ) =>
      set((state) => ({
        threadsByDocument: {
          ...state.threadsByDocument,
          [documentId]: (state.threadsByDocument[documentId] ?? []).map(
            (thread) =>
              thread.id === threadId
                ? {
                    ...thread,
                    comments: thread.comments.map((comment) =>
                      comment.id === tempId ? newComment : comment
                    ),
                  }
                : thread
          ),
        },
      })),
    removeComment: (
      documentId: string,
      threadId: string,
      commentId: string
    ) =>
      set((state) => ({
        threadsByDocument: {
          ...state.threadsByDocument,
          [documentId]: (state.threadsByDocument[documentId] ?? []).map(
            (thread) =>
              thread.id === threadId
                ? {
                    ...thread,
                    comments: thread.comments.filter(
                      (comment) => comment.id !== commentId
                    ),
                  }
                : thread
          ),
        },
      })),
  })
);
