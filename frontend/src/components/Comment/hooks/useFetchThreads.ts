import { fetchThreads } from "@/api/thread";
import { useQuery } from "@tanstack/react-query";
import { FetchThreadProps } from "./types";

export const useFetchThreads = ({
    documentId,
    startOffset,
    endOffset,
  }: FetchThreadProps) => {
    const enabled = !!documentId && startOffset !== undefined && endOffset !== undefined;
    return useQuery({
      queryKey: ["threads", documentId, { startOffset, endOffset }],
      queryFn: ({ queryKey }) => {
        const [, docId, params] = queryKey as [string, string, { startOffset: number; endOffset: number }];
        return fetchThreads(docId, params?.startOffset, params?.endOffset);
      },
      enabled:enabled,
      staleTime: 5 * 60 * 1000,
    });
  };
    
