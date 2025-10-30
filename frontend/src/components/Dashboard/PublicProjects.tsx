import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, Search } from "lucide-react";
import { fetchPublicProjects } from "@/api/project";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Types for OpenPecha data structures and backend API response

export interface OpenPechaTemplateProject {
  id: string;
  name: string;
  identifier: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    source: string;
    template: boolean;
    expression_id: string;
    manifestation_id: string;
  };
  status: string;
  isPublic: boolean;
  publicAccess: string;
  shareLink: string;
  owner: {
    id: string;
    username: string;
    picture: string;
  };
  roots: Array<{
    id: string;
    name: string;
    updatedAt: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: OpenPechaTemplateProject[];
  pagination?: {
    currentPage: number; // ftv - current page number
    page: number; // backward compatibility
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startItem: number;
    endItem: number;
    nextPage: number | null;
    prevPage: number | null;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
  meta?: {
    total: number;
    count: number;
    ftv: number; // Current page number
  };
}

const PublicProjects = ({ showAll = false }: { showAll?: boolean }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine limit based on showAll prop
  const limit = showAll ? 12 : 4; // 12 for pagination, 4 for single row

  const {
    data,
    isLoading: isLoadingTemplates,
    isError: publicProjectsError,
  } = useQuery<ApiResponse>({
    queryKey: ["publicProjects", currentPage, limit, searchQuery],
    queryFn: () =>
      fetchPublicProjects({
        page: currentPage,
        limit,
        search: searchQuery,
      }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const publicProjectData: OpenPechaTemplateProject[] | undefined =
    data?.data ?? [];

  const pagination = data?.pagination;

  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Helper function to render pagination items
  const renderPaginationItems = () => {
    if (!pagination) return null;

    const items = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;

    // Always show first page
    if (totalPages > 5 && currentPage > 3) {
      items.push(
        <PaginationItem key="page-1">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 4) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    // Show current page range
    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={`page-${i}`}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show last page
    if (totalPages > 5 && currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={`page-${totalPages}`}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoadingTemplates) {
    return (
      <div className="space-y-4">
        {showAll && (
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        )}
        {/* Mobile List Skeleton */}
        <div className="flex flex-col gap-2 sm:hidden">
          {Array.from({ length: showAll ? 12 : 4 }, (_, index) => (
            <div
              key={`skeleton-mobile-${showAll ? "all" : "preview"}-${index}`}
              className="flex items-center gap-3 p-3 border bg-neutral-50 dark:bg-neutral-700 animate-pulse rounded-lg"
            >
              {/* Icon skeleton */}
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>

              {/* Content skeleton */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Grid Skeleton */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: showAll ? 12 : 4 }, (_, index) => (
            <div
              key={`skeleton-desktop-${showAll ? "all" : "preview"}-${index}`}
              className="flex flex-col gap-6 border py-3 shadow-sm bg-neutral-50 dark:bg-neutral-700 animate-pulse aspect-square"
            >
              <div className="px-4 flex flex-col h-full">
                {/* Header skeleton */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>

                {/* Content skeleton */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                  </div>

                  {/* Stats skeleton */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-4">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (publicProjectsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-red-600">
          {t(
            "publicProject.failedToLoadTemplates",
            "Failed to load publicProjects"
          )}
        </span>
      </div>
    );
  }

  if (
    !isLoadingTemplates &&
    (!publicProjectData || publicProjectData.length === 0)
  ) {
    return null;
  }

  const renderProjectCard = (publicProject: OpenPechaTemplateProject) => {
    const cardTitle = publicProject.name || publicProject.identifier;
    const rootDocument = publicProject.roots[0];
    return (
      <Link
        to={rootDocument ? `/documents/${rootDocument.id}` : "#"}
        title={cardTitle}
        key={publicProject.id}
        className="cursor-pointer group w-full"
      >
        <div className="space-y-2">
          <div
            className={`border border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden aspect-square bg-neutral-50 dark:bg-neutral-700`}
          >
            <div className="px-4 pt-6 h-full flex justify-center bg-gradient-to-br from-secondary/30 to-muted/30">
              <div className="w-full text-center space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  TEXT
                </div>
                <div className="text-[10px] leading-[normal] font-monlam text-foreground/80 line-clamp-4 px-2">
                  {publicProject.name}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-0.5 px-1" title={publicProject.name}>
            <span className="text-md truncate text-foreground font-light font-monlam-2 line-clamp-1">
              {publicProject.name}
            </span>
            <span className="text-xs flex justify-end gap-1 text-muted-foreground">
              {publicProject.owner?.picture && (
                <img
                  src={publicProject.owner.picture}
                  className="w-4 h-4 rounded-full inline-block mr-1"
                  alt={publicProject.owner.username}
                />
              )}
              {publicProject.owner?.username}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-4 ">
      {showAll && (
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder={t(
                "project.searchPublicProjects",
                "Search public projects"
              )}
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Mobile List View */}
      <div className="flex flex-col gap-2 sm:hidden">
        {publicProjectData?.map((publicProject) => {
          if (!publicProject) return null;
          return (
            <ProjectListItem
              publicProject={publicProject}
              key={publicProject.id}
            />
          );
        })}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {publicProjectData?.map((publicProject) => {
          if (!publicProject) return null;
          return renderProjectCard(publicProject);
        })}
      </div>

      {showAll && pagination && (
        <div className="space-y-3 mt-6">
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.hasPrevPage && pagination.prevPage) {
                        handlePageChange(pagination.prevPage);
                      }
                    }}
                    className={
                      pagination.hasPrevPage
                        ? ""
                        : "pointer-events-none opacity-50"
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.hasNextPage && pagination.nextPage) {
                        handlePageChange(pagination.nextPage);
                      }
                    }}
                    className={
                      pagination.hasNextPage
                        ? ""
                        : "pointer-events-none opacity-50"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
};

const ProjectListItem = ({
  publicProject,
}: {
  publicProject: OpenPechaTemplateProject;
}) => {
  const cardTitle = publicProject.name || publicProject.identifier;
  const rootDocument = publicProject.roots[0];
  return (
    <Link
      to={rootDocument ? `/documents/${rootDocument.id}` : "#"}
      title={cardTitle}
      key={publicProject.id}
      className="cursor-pointer group w-full"
    >
      <div className="flex items-center gap-3 p-3 border border-border/50 hover:shadow-md transition-all duration-300 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
        {/* Small icon/indicator */}
        <div className="flex-shrink-0 w-8 h-8 rounded bg-gradient-to-br from-secondary/30 to-muted/30 flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">T</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground font-monlam-2 truncate">
              {publicProject.name}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {publicProject.owner?.picture && (
                <img
                  src={publicProject.owner.picture}
                  className="w-4 h-4 rounded-full"
                  alt={publicProject.owner.username}
                />
              )}
              <span className="text-xs text-muted-foreground">
                {publicProject.owner?.username}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PublicProjects;
