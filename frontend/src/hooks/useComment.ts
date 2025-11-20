import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThread, Thread } from "@/api/thread";
import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";
import { useCommentStore } from "@/stores/commentStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useAIComment } from "./useAIComment";


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
