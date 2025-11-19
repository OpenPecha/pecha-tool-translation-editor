import { useQuery } from "@tanstack/react-query";
import { getPorjectCollaborators } from "../api/project";

export const useProjectCollaborators = (
  projectId: string,
) => {
  return useQuery({
    queryKey: ["project", projectId, "accessible-users"],
    queryFn: () => getPorjectCollaborators(projectId),
    enabled: !!projectId
  });
};
