import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteThread, Thread } from "@/api/thread";

export const useDeleteThread = () => {

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (thread: Thread) => deleteThread(thread.id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["threads", variables.documentId] });
    }
  });
};