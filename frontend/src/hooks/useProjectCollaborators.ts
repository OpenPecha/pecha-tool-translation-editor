import { useQuery } from "@tanstack/react-query";
import { getPorjectCollaborators } from "../api/project";

export const useProjectCollaborators = (
  projectId: string,
) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getPorjectCollaborators(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
};
