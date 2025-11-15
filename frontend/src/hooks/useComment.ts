import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThread, fetchThreadsByDocumentId, Thread } from "@/api/thread";
import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";
import { useCommentStore } from "@/stores/commentStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useAIComment } from "./useAIComment";

export const useFetchThreads = (documentId: string) => {
  return useQuery<Thread[]>({
    queryKey: ["threads", documentId],
    queryFn: () => fetchThreadsByDocumentId(documentId),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateThread = (documentId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const {
    setNewCommentRange,
    openSidebar,
    setActiveThreadId,
  } = useCommentStore();
  const { getActiveEditorDocumentId } = useSelectionStore();
  const { generateAIComment } = useAIComment(documentId);

  return useMutation({
    mutationFn: async (content: string) => {
      // Get the active editor's documentId from selectionStore
      const activeDocumentId = getActiveEditorDocumentId();
      const targetDocumentId = activeDocumentId || documentId;
      
      // Get selection from selectionStore for the active editor
      const selectionStore = useSelectionStore.getState();
      const activeSelection = selectionStore.source || selectionStore.translation;
      
      if (!activeSelection || !activeSelection.range || !currentUser) {
        throw new Error("User or selection range is missing.");
      }

      const selectedText = activeSelection.text || "";

      const newThread = await createThread(
        targetDocumentId,
        activeSelection.range.index,
        activeSelection.range.index + activeSelection.range.length,
        selectedText
      );
      
      if(content.includes("@ai")) {
        await generateAIComment(content, newThread.id, newThread);
      } else {
        await createComment(targetDocumentId, currentUser.id, content, newThread.id, {
          isSuggestion: false,
          suggestedText: "",
          isSystemGenerated: false,
          selectedText: selectedText,
        });
      }

      return { newThread, activeSelection, targetDocumentId };
    },
    onSuccess: ({ newThread, targetDocumentId }) => {
      queryClient.invalidateQueries({ queryKey: ["threads", targetDocumentId] });
      openSidebar(targetDocumentId, "thread", newThread.id);
      setActiveThreadId(targetDocumentId, newThread.id);
      setNewCommentRange(targetDocumentId, null);
    },
  });
};

export const useSimpleCreateThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      documentId: string;
      initialStartOffset: number;
      initialEndOffset: number;
      selectedText: string;
    }) =>
      createThread(
        data.documentId,
        data.initialStartOffset,
        data.initialEndOffset,
        data.selectedText
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["threads", data.documentId] });
    }
  });
};

export const useAddComment = (documentId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { data: threads = [] } = useFetchThreads(documentId);

  return useMutation({
    mutationFn: ({
      content,
      threadId,
      mentionedUserIds,
    }: {
      content: string;
      threadId: string | null;
      mentionedUserIds?: string[];
    }) => {
      if (!currentUser) throw new Error("User is not authenticated.");
      const activeThread = threads.find((t) => t.id === threadId);
      return createComment(documentId, currentUser.id, content, threadId, {
        selectedText: activeThread?.selectedText || "",
        mentionedUserIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads", documentId] });
    },
  });
};
