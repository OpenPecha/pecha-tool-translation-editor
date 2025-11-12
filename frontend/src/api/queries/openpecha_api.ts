import { useQuery } from "@tanstack/react-query";
import { fetchInstances, fetchTextContent, fetchTexts } from "../openpecha";


interface useFetchTextsParams {
  type?: string;
  limit?: number;
  offset?: number;
  language?: string;
}

export const useFetchTexts = (
  {
    type,
    limit,
    offset,
    language
  }:useFetchTextsParams
) => {
  return useQuery({
    queryKey: ["texts", type, limit, offset, language],
    queryFn: () => fetchTexts({ type, limit, offset, language }),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFetchInstances = (textId: string) => {
  return useQuery({
    queryKey: ["instances", textId],
    queryFn: () => fetchInstances(textId),
    enabled: !!textId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFetchTextContent = (instanceId: string) => {
  return useQuery({
    queryKey: ["textContent", instanceId],
    queryFn: () => fetchTextContent(instanceId),
    enabled: !!instanceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
