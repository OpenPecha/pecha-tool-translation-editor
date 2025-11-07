import { useQuery } from "@tanstack/react-query";
import { fetchVersions } from "../version";

export const useFetchVersions = (docId: string) => {
  return useQuery({
    queryKey: [`versions-${docId}`],
    enabled: !!docId,
    queryFn: () => fetchVersions(docId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};
