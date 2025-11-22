import { useQuery } from "@tanstack/react-query";
import { FetchSegmentsProps } from "./types";
import { fetchSegmentsWithContent } from "@/api/openpecha";

export const useFetchSegments = ({
    textId,
    startOffset,
    endOffset,
  }: FetchSegmentsProps) => {
    return useQuery({
      queryKey: ["segments", textId, { startOffset, endOffset }],
      queryFn: () => fetchSegmentsWithContent(textId, startOffset, endOffset),
      enabled: !!textId && startOffset !== undefined && endOffset !== undefined,
      staleTime: 10*60*1000
    });
  };