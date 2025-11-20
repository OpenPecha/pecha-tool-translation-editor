import { fetchCommentsByThreadId } from "@/api/comment";
import { useQuery} from "@tanstack/react-query";

export const useFetchComments = (threadId: string) => {
  return useQuery({
    queryKey: ["comments", threadId],
    queryFn: () => fetchCommentsByThreadId(threadId),
    enabled: !!threadId,
  });
};