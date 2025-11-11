import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThread, fetchThreadsByDocumentId, Thread } from "@/api/thread";
import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";
import { useEditor } from "@/contexts/EditorContext";
import { useCommentStore } from "@/stores/commentStore";

export const useFetchThreads = (documentId: string) => {
  return useQuery<Thread[]>({
    queryKey: ["threads", documentId],
    queryFn: () => fetchThreadsByDocumentId(documentId),
    enabled: !!documentId,
  });
};

export const useCreateThread = (documentId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { getQuill } = useEditor();
  const { newCommentRange, setNewCommentRange, openSidebar, setActiveThreadId } =
    useCommentStore();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!newCommentRange || !currentUser) {
        throw new Error("User or selection range is missing.");
      }
      const quill = getQuill(documentId);
      const selectedText =
        quill?.getText(newCommentRange.index, newCommentRange.length) || "";

      const newThread = await createThread(
        documentId,
        newCommentRange.index,
        newCommentRange.length,
        selectedText
      );

      await createComment(documentId, currentUser.id, content, newThread.id, {
        isSuggestion: false,
        suggestedText: "",
        isSystemGenerated: false,
        selectedText: selectedText,
      });

      return { newThread, newCommentRange };
    },
    onSuccess: ({ newThread, newCommentRange }) => {
      const quill = getQuill(documentId);
      if (quill && newThread && newCommentRange) {
        quill.formatText(
          newCommentRange.index,
          newCommentRange.length,
          "comment",
          {
            id: newThread.id,
            threadId: newThread.id,
          },
          "user"
        );
      }
      queryClient.invalidateQueries({ queryKey: ["threads", documentId] });
      openSidebar("thread", newThread.id);
      setActiveThreadId(newThread.id);
      setNewCommentRange(null);
    },
  });
};

export const useAddComment = (documentId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { threads } = useCommentStore();

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
