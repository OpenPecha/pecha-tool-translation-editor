import { useState, useMemo, useEffect } from "react";
import DocumentCreateModal from "./DocumentCreateModal/DocumentCreateModal";
import { Button } from "@/components/ui/button";
import { Project } from "@/api/project";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { INITIAL_PROJECT_LIMIT } from "@/config";
import { useFetchProjects } from "@/api/queries/projects";

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
              {t(`project.gallery`)} <ArrowUpDownIcon size={16} />
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
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("list");
  const [selectedOwner, setSelectedOwner] = useState<string | null>(
    "ownedByAnyone"
  );
  const { searchQuery } = useSearchStore();
  const { currentUser } = useAuth();

  const uniqueOwners = ["ownedByMe", "ownedByAnyone", "notOwnedByMe"];
  const itemsPerPage = INITIAL_PROJECT_LIMIT;

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOwner]);
  // Get unique owners for the filter dropdown

  const { data, isLoading, isError, isFetching, isPending } = useFetchProjects({
    searchQuery,
    page,
    itemsPerPage,
    selectedOwner,
  });

  const showLoader = isLoading || isPending;
  const { data: projects = [], pagination } = data;

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || 1;
  const totalProjects = pagination?.total || 0;

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (selectedOwner === "ownedByMe")
      filtered = projects.filter(
        (project: Project) => project.owner?.id === currentUser?.id
      );
    else if (selectedOwner === "notOwnedByMe")
      filtered = projects.filter(
        (project: Project) => project.owner?.id !== currentUser?.id
      );
    return filtered;
  }, [projects, selectedOwner, currentUser?.id]);

  const categorizedProjects = useMemo(() => {
    return categorizeProjectsByTime(filteredProjects);
  }, [filteredProjects]);

  // Pagination handlers
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !isFetching) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-4 w-full">
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {"Failed to fetch projects"}
        </div>
      )}
      <div className="max-w-5xl mx-auto mb-2">
        {filteredProjects?.length === 0 && !showLoader && (
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

        {/* Shadcn UI Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 mt-8 mb-6">
            {/* Shadcn Pagination Component */}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => goToPage(currentPage - 1)}
                    className={
                      currentPage === 1 || isFetching
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === "ellipsis") {
                    return (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => goToPage(pageNum as number)}
                        isActive={pageNum === currentPage}
                        className={
                          isFetching
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => goToPage(currentPage + 1)}
                    className={
                      currentPage === totalPages || isFetching
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            {/* Loading indicator */}
            {isFetching && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <FaSpinner className="animate-spin" />
                <span>Loading...</span>
              </div>
            )}
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
  const { t } = useTranslation();
  const selectedOwnerName = selectedOwner
    ? uniqueOwners.find((owner) => owner === selectedOwner)
    : "All";

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center py-2 px-1 mb-6 gap-4">
        <div className="flex-grow min-w-0">
          <span className="text-md md:text-xl font-medium text-neutral-700/80 dark:text-neutral-100">
            {t(`project.myProjects`)}
          </span>
        </div>

        <div className="hidden sm:flex flex-shrink-0 mx-4 w-36 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-2 w-fit"
              >
                {t(`project.${selectedOwnerName}`)}
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {uniqueOwners.map((owner) => (
                <DropdownMenuItem
                  key={owner}
                  onClick={() => onOwnerChange(owner)}
                >
                  {t(`project.${owner}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden sm:flex flex-shrink-0 w-36 items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {t(`project.lastModified`)}
          </span>
        </div>

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

        {/* Mobile version */}
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
            {t(`${getCategoryTitle(category.category)}`)}
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
