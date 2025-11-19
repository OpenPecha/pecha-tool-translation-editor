import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addComment } from "@/api/comment";
import { AddCommentProps } from "./types";
import { useAuth } from "@/auth/use-auth-hook";

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  return useMutation({
    onMutate: async (comment: AddCommentProps) => {
      await queryClient.cancelQueries({ queryKey: ["thread", comment.threadId] });
      const previousThreads = queryClient.getQueryData(["thread", comment.threadId]);
      queryClient.setQueryData(["thread", comment.threadId], (old: any) => {
        const newComment = {
          id: Date.now().toString(),
          content: comment.content,
          user: currentUser,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystemGenerated: false,
          threadId: comment.threadId,
        };
        let aiComment = null;
        if(comment.content.includes("@ai")) {
          aiComment = {
            id: Date.now().toString(),
            content: "",
            user: {
              id: "ai-assistant",
              username: "AI Assistant",
              email: "ai@assistant.com",
              picture: undefined,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isSystemGenerated: true,
            threadId: comment.threadId,
          };
        }
        return {
          ...(old || {}),
          comments: [...(old?.comments || []), newComment, ...(aiComment ? [aiComment] : [])]
        };
      });
      return { previousThreads };
    },
    mutationFn: (comment: AddCommentProps) => {
      return addComment(comment);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["thread", variables.threadId] });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(["thread", _variables.threadId], context.previousThreads);
      }
    },
  });
};