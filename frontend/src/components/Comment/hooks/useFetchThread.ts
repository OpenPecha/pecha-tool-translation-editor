import { fetchThread } from "@/api/thread";
import { useQuery } from "@tanstack/react-query";

export const useFetchThread = ({ threadId }: { threadId: string }) => {
  console.log("threadId :::",threadId);
  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchThread(threadId),
    enabled: !!threadId,
  });
};