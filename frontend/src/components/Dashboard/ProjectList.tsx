import { useEffect, useState } from "react";
import DocumentCreateModal from "../DocumentCreateModal/DocumentCreateModal";
import "./style.css";

import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, Project } from "@/api/project";
import EachProject from "./EachProject";
import { useSearch } from "@/contexts/SearchContext";
import { useMatomo } from "@datapunt/matomo-tracker-react";

const ProjectList = () => {
  const { searchQuery } = useSearch();
  const [page, setPage] = useState(1);
  const { trackSiteSearch } = useMatomo();
  const limit = 10;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["projects", searchQuery, page],
    initialData: { data: [] },
    queryFn: () => fetchProjects({ searchQuery, page, limit }),
  });
  const { data: projects, total } = data;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const result_count = projects?.length;
    if (searchQuery && data?.pagination) {
      trackSiteSearch({
        keyword: searchQuery,
        category: "search project",
        count: result_count,
      });
    }
  }, [data]);

  return (
    <div className="flex flex-1 flex-col h-[100vh] ">
      <div className="pt-10 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-medium mb-6 text-gray-600">
            Start a new project
          </h1>
          <DocumentCreateModal />
        </div>
      </div>
      <div className="px-4 w-full">
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {"Failed to fetch projects"}
          </div>
        )}
        <div className="max-w-5xl mx-auto">
          {(isFetching || isLoading) && <div>loading</div>}
          {projects?.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p>You don't have any projects yet. Create one to get started!</p>
            </div>
          )}
          {projects?.length > 0 && (
            <>
              <ProjectsGrid
                projects={projects}
                isLoading={isLoading || isFetching}
              />
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectsGrid = ({
  projects,
  isLoading,
}: {
  projects: Project[];
  isLoading: boolean;
}) => {
  const [view, setView] = useState<"grid" | "list">("list");

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-600">Your Projects</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-sm">
            All Projects
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-sm">
            Shared Projects
          </Button>
          <div className="flex gap-1">
            {view === "list" ? (
              <Button
                onClick={() => setView("grid")}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <span className="sr-only">Grid view</span>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path
                    fill="currentColor"
                    d="M1 1h6v6H1V1zm8 0h6v6H9V1zm-8 8h6v6H1V9zm8 0h6v6H9V9z"
                  />
                </svg>
              </Button>
            ) : (
              <Button
                onClick={() => setView("list")}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <span className="sr-only">List view</span>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path
                    fill="currentColor"
                    d="M1 1h14v2H1V1zm0 4h14v2H1V5zm0 4h14v2H1V9zm0 4h14v2H1v-2z"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>
      <div
        className={`flex flex-wrap gap-4 ${
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4"
            : "flex-col"
        }`}
      >
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          projects.map((project) => (
            <EachProject view={view} key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
};

const PaginationControls = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (typeof totalPages === "number" && totalPages < 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
};

export default ProjectList;
