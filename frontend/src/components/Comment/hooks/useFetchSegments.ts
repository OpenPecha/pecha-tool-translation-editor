import { useQuery } from "@tanstack/react-query";
import { FetchSegmentsProps } from "./types";
import { fetchSegmentsWithContent } from "@/api/openpecha";

export const useFetchSegments = ({
    instanceId,
    startOffset,
    endOffset,
  }: FetchSegmentsProps) => {
    return useQuery({
      queryKey: ["segments", { instanceId, startOffset, endOffset }],
      queryFn: () => fetchSegmentsWithContent(instanceId, startOffset, endOffset),
      enabled: !!instanceId && !!startOffset && !!endOffset,
      staleTime: 5 * 60 * 1000,
    });
  };