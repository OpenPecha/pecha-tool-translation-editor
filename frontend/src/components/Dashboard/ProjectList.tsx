import { useState, useMemo, useEffect } from "react";
import DocumentCreateModal from "./DocumentCreateModal/DocumentCreateModal";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, Project } from "@/api/project";
import EachProject from "./EachProject";
import { useAuth } from "@/auth/use-auth-hook";
import { FaSpinner } from "react-icons/fa";
import { useSearchStore } from "@/stores/searchStore";
import { useTranslation } from "react-i18next";
import {
  categorizeProjectsByTime,
  getCategoryTitle,
  type CategorizedProject,
} from "@/lib/dateUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDownIcon, ChevronDown } from "lucide-react";
import PublicProjects from "./PublicProjects";
import { useSearchParams } from "react-router-dom";

const ProjectList = () => {
  const { t } = useTranslation();
  const [param, setParam] = useSearchParams();
  const ftv = param.get("ftv");

  const handleViewAllPublicProjects = () => {
    if (ftv)
      setParam((prev) => {
        prev.delete("ftv");
        return prev;
      });
    else setParam((prev) => ({ ...prev, ftv: "1" }));
  };

  return (
    <div className="flex flex-1 flex-col h-[100vh] overflow-y-scroll">
      <div
        className="pt-10 px-6  bg-neutral-400/10 "
        style={{ minHeight: ftv ? "fit-content" : "auto" }}
      >
        <div className="max-w-5xl  mx-auto ">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium mb-6">
              {t(`projects.startNewProject`)}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className={`hover:bg-neutral-300/50 capitalize ${
                ftv ? "bg-neutral-300/50" : ""
              }`}
              onClick={handleViewAllPublicProjects}
            >
              gallery <ArrowUpDownIcon size={16} />
            </Button>
          </div>

          <div className={`flex items-stretch gap-6 mb-24 `}>
            {!ftv && <DocumentCreateModal />}
            <div className="flex gap-6 flex-wrap">
              {ftv && <DocumentCreateModal />}
              <PublicProjects showAll={!!ftv} />
            </div>
          </div>
        </div>
      </div>
      {!ftv && <ProjectsListSection />}
    </div>
  );
};

interface ProjectsSectionProps {
  categorizedProjects: CategorizedProject[];
  uniqueOwners: string[];
  selectedOwner: string | null;
  onOwnerChange: (ownerId: string | null) => void;
  isLoading: boolean;
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}

const ProjectsListSection = () => {
  const [displayCount, setDisplayCount] = useState(15); // Show first 15 projects\
  const limit = 50;
  const [view, setView] = useState<"grid" | "list">("list");
  const [selectedOwner, setSelectedOwner] = useState<string | null>(
    "Owned by anyone"
  );
  const { searchQuery } = useSearchStore();

  const { currentUser } = useAuth();
  // Filter projects by selected owner and limit display count

  // Get unique owners for the filter dropdown
  const uniqueOwners = ["Owned by me", "Owned by anyone", "Not owned by me"];

  // Categorize projects by time using displayed projects
  const { data, isLoading, isError, isFetching, isPending } = useQuery({
    queryKey: ["projects", searchQuery],
    initialData: { data: [] },
    queryFn: () => fetchProjects({ searchQuery, page: 1, limit }),
    refetchOnWindowFocus: false,
  });

  const showLoader = isLoading || isFetching || isPending;
  // Reset display count when search or filter changes
  const resetDisplayCount = () => {
    setDisplayCount(15);
  };

  // Reset display count when search or filter changes
  useEffect(() => {
    resetDisplayCount();
  }, [searchQuery, selectedOwner]);
  // Check if there are more projects to show

  // Function to load more projects
  const loadMoreProjects = () => {
    setDisplayCount((prev) => prev + 15);
  };
  const { data: projects } = data;
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (selectedOwner === "Owned by me")
      filtered = projects.filter(
        (project: Project) => project.owner?.id === currentUser?.id
      );
    else if (selectedOwner === "Not owned by me")
      filtered = projects.filter(
        (project: Project) => project.owner?.id !== currentUser?.id
      );
    return filtered;
  }, [projects, selectedOwner, currentUser?.id]);
  const hasMoreProjects = filteredProjects.length > displayCount;
  // Limit displayed projects for pagination
  const displayedProjects = useMemo(() => {
    return filteredProjects.slice(0, displayCount);
  }, [filteredProjects, displayCount]);

  const categorizedProjects = useMemo(() => {
    return categorizeProjectsByTime(displayedProjects || []);
  }, [displayedProjects]);
  return (
    <div className="px-4 w-full">
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {"Failed to fetch projects"}
        </div>
      )}
      <div className="max-w-5xl mx-auto mb-2">
        {filteredProjects?.length === 0 && !isLoading && !isFetching && (
          <div className="text-center py-8">
            <p>You don't have any projects yet. Create one to get started!</p>
          </div>
        )}
        <ProjectsSection
          categorizedProjects={categorizedProjects}
          uniqueOwners={uniqueOwners}
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
          isLoading={showLoader}
          view={view}
          setView={setView}
        />
        {hasMoreProjects && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreProjects}
              className="px-6"
            >
              View More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectsSection = ({
  categorizedProjects,
  uniqueOwners,
  selectedOwner,
  onOwnerChange,
  isLoading,
  view,
  setView,
}: ProjectsSectionProps) => {
  const selectedOwnerName = selectedOwner
    ? uniqueOwners.find((owner) => owner === selectedOwner)
    : "All";

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center py-2 px-1 mb-6 gap-4">
        {/* Icon space to align with project items */}
        {/* <div className="flex-shrink-0 mr-4 w-[26px]"></div> */}

        {/* Project title section - aligned with name column */}
        <div className="flex-grow min-w-0">
          <span className="text-md md:text-xl font-medium text-neutral-700/80 dark:text-neutral-100">
            My Projects
          </span>
        </div>

        {/* Owner Filter Dropdown - aligned with owner column */}
        <div className="hidden sm:flex flex-shrink-0 mx-4 w-36 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-2 w-fit"
              >
                {selectedOwnerName}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {uniqueOwners.map((owner) => (
                <DropdownMenuItem
                  key={owner}
                  onClick={() => onOwnerChange(owner)}
                >
                  {owner}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Last modified label - aligned with date column */}
        <div className="hidden sm:flex flex-shrink-0 w-36 items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Last modified
          </span>
        </div>

        {/* View toggle - aligned with actions column */}
        <div className="flex-shrink-0 ml-2 w-[52px] flex justify-center">
          <div className="flex gap-1">
            {view === "list" ? (
              <button
                title="grid view"
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-neutral-200 dark:hover:bg-neutral-700"
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

        {/* Mobile: Show owner filter and view toggle below on small screens */}
        <div className="sm:hidden flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-2 w-fit"
              >
                {selectedOwnerName}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {uniqueOwners.map((owner) => (
                <DropdownMenuItem
                  key={owner}
                  onClick={() => onOwnerChange(owner)}
                >
                  {owner}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-1">
            {view === "list" ? (
              <button
                title="grid view"
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
                className="rounded-full cursor-pointer h-8 w-8 flex justify-center items-center hover:bg-neutral-200 dark:hover:bg-neutral-700"
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

      {/* Categorized Projects */}
      {categorizedProjects.map((category) => (
        <div key={category.category} className="mb-8">
          <div className=" text-smtext-neutral-600 dark:text-neutral-300 mb-3 px-1">
            {getCategoryTitle(category.category)}
          </div>
          <div
            className={`${
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "flex flex-col gap-1"
            }`}
          >
            {category.projects.map((project) => (
              <EachProject
                view={view}
                key={project.id}
                project={project}
                timeCategory={category.category}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;
