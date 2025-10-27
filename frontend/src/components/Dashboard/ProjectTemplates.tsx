import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { fetchProjects } from "@/api/project";
import { MAX_TEMPLATES } from "@/utils/Constants";
import { useTranslation } from "react-i18next";
// Types for OpenPecha data structures
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
  };
  roots: Array<{
    id: string;
    name: string;
    updatedAt: string;
  }>;
}

const ProjectTemplates = () => {
  const { t } = useTranslation();

  // Fetch templates using the new single endpoint

  const {
    data,
    isLoading: isLoadingTemplates,
    isError: templatesError,
  } = useQuery({
    queryKey: ["templates", MAX_TEMPLATES],
    queryFn: () =>
      fetchProjects({ page: 1, limit: MAX_TEMPLATES, isPublic: true }),
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
  const templateData = data?.data;

  if (isLoadingTemplates) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {Array.from({ length: MAX_TEMPLATES }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-6  border py-3 shadow-sm bg-neutral-50 dark:bg-neutral-700 animate-pulse"
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

  if (templatesError) {
    return (
      <div className="flex items-center justify-center py-8">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-red-600">
          {t("template.failedToLoadTemplates", "Failed to load templates")}
        </span>
      </div>
    );
  }

  if (!isLoadingTemplates && templateData?.length === 0) {
    return null;
  }
  return (
    <div className="flex gap-4 h-full">
      {templateData?.map((template: TemplateData) => {
        const alternativeTitle = template?.name || template?.identifier;
        const card_title =
          alternativeTitle.length > 0
            ? JSON.stringify(alternativeTitle)
            : template.title;
        const rootDocument = template.roots[0];
        return (
          <Link
            to={`/documents/${rootDocument.id}`}
            title={JSON.stringify(card_title)}
            key={rootDocument.id}
            className="flex-shrink-0 cursor-pointer group"
            style={{ width: "180px" }}
          >
            <div className="space-y-2">
              <div
                className={`border border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden h-[180px]  bg-neutral-50 dark:bg-neutral-700 `}
              >
                <div className="px-4 pt-6 h-full flex justify-center bg-gradient-to-br from-secondary/30 to-muted/30">
                  <div className=" w-full text-center space-y-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      TEXT
                    </div>
                    <div className="text-[10px] leading-[normal] font-monlam text-foreground/80 line-clamp-4 px-2">
                      {template.name}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-0.5 px-1" title={template.title}>
                <span className="text-md truncate text-foreground font-light font-monlam-2 line-clamp-1">
                  {template.title}
                </span>

                <span className="text-xs flex justify-end gap-1 text-muted-foreground">
                  <img
                    src={template.owner.picture}
                    className="w-4 h-4 rounded-full inline-block mr-1"
                    alt={template.owner.username}
                  />
                  {template.owner.username}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectTemplates;
