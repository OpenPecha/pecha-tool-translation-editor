import { useState } from "react";
import DocumentCreateModal from "./DocumentCreateModal/DocumentCreateModal";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, Project } from "@/api/project";
import EachProject from "./EachProject";
import { useAuth } from "@/auth/use-auth-hook";
import { FaSpinner } from "react-icons/fa";
import { useSearchStore } from "@/stores/searchStore";
import { useTranslation } from "react-i18next";

const ProjectList = () => {
  const { searchQuery } = useSearchStore();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [view, setView] = useState<"grid" | "list">("list");

  const { data, isLoading, isError, isFetching, isPending } = useQuery({
    queryKey: ["projects", searchQuery, page],
    initialData: { data: [] },
    queryFn: () => fetchProjects({ searchQuery, page, limit }),
    refetchOnWindowFocus: false,
  });
  const { data: projects, pagination } = data;
  const totalPages = Math.ceil(pagination?.totalItems / limit);
  const { t } = useTranslation();

  const showLoader = isLoading || isFetching || isPending;

  return (
    <div className="flex flex-1 flex-col h-[100vh] overflow-y-scroll ">
      <div className="pt-10 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-medium mb-6 text-gray-700">
            {t(`projects.startNewProject`)}
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
        <div className="max-w-5xl mx-auto mb-2">
          {projects?.length === 0 && !isLoading && !isFetching && (
            <div className="text-center py-8">
              <p>You don't have any projects yet. Create one to get started!</p>
            </div>
          )}
          <ProjectsGrid
            projects={projects}
            isLoading={showLoader}
            view={view}
            setView={setView}
          />
          {projects?.length > 0 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectsGrid = ({
  projects,
  isLoading,
  view,
  setView,
}: {
  projects: Project[];
  isLoading: boolean;
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}) => {
  const [showAll, setShowAll] = useState<boolean>(true);
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  return (
    <div className="mb-8 ">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-700">
          {t("projects.yourproject")}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-sm cursor-pointer `}
            onClick={() => setShowAll((p) => !p)}
            color="white"
          >
            {!showAll
              ? t("projects.allprojects")
              : t("projects.sharedprojects")}
          </Button>
          <div className="flex gap-1">
            {view === "list" ? (
              <button
                title="grid view"
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-gray-200 "
                onClick={() => setView("grid")}
              >
                <span className="sr-only">Grid view</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  fill="gray"
                >
                  <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-360h160v-200H160v200Zm240 0h160v-200H400v200Zm240 0h160v-200H640v200ZM320-240v-200H160v200h160Zm80 0h160v-200H400v200Zm240 0h160v-200H640v200Z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setView("list")}
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-gray-200 "
              >
                <span className="sr-only">List view</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="gray"
                >
                  <path d="M80-160v-160h160v160H80Zm240 0v-160h560v160H320ZM80-400v-160h160v160H80Zm240 0v-160h560v160H320ZM80-640v-160h160v160H80Zm240 0v-160h560v160H320Z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {isLoading && (
        <FaSpinner size="30" className="animate-spin w-full mb-2" />
      )}
      <div
        className={`flex flex-wrap gap-4 ${
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4"
            : "flex-col"
        }`}
      >
        {projects.length > 0 &&
          projects
            .filter((project) => showAll || project.ownerId !== currentUser?.id)
            .map((project) => (
              <EachProject view={view} key={project.id} project={project} />
            ))}
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
  if (typeof totalPages === "number" && totalPages < 2) return null;
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
      <span className="text-sm text-gray-700">
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
