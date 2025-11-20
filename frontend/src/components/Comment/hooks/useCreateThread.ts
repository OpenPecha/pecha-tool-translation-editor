import { createThread } from "@/api/thread";
import { useMutation } from "@tanstack/react-query";
import { CreateThreadProps } from "./types";
import { useQueryClient } from "@tanstack/react-query";

export const useCreateThread = () => {
const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      initialStartOffset,
      initialEndOffset,
      selectedText,
    }: CreateThreadProps) => createThread(documentId, initialStartOffset, initialEndOffset, selectedText),
    
    onSuccess: (data) => {
      // Set the thread data in cache so optimistic updates work
      queryClient.setQueryData(["thread", data.id], {
        ...data,
        comments:[]
      });
      // Also invalidate the threads list
      queryClient.invalidateQueries({queryKey : ["threads", data.documentId]});
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({queryKey : ["threads", data.documentId]});
      }
    }
  });
};