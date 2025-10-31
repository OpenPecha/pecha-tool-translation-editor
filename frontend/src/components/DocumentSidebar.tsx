import { useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  ChevronLeft,
  Info,
  MessageCircle,
  BookOpen,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TableOfContentSidebar from "./TableOfContentSidebar";
import Comments from "./EditorSideMenu/Comments";
import { useQuery } from "@tanstack/react-query";
import { fetchDocument } from "@/api/document";
import TableOfContent from "./TableOfContent";
import { useTranslation } from "react-i18next";
import Resources from "./EditorSideMenu/Resources";
interface DocumentSidebarProps {
  documentId: string;
}

// Metadata content component for sidebar
const MetadataContent = ({ documentId }: { documentId: string }) => {
  const { t } = useTranslation();
  const {
    data: document,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId),
    enabled: !!documentId,
  });

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
          Loading...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-red-600 dark:text-red-400">
        Error loading document information
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-3 text-xs text-gray-500">
        No document information available
      </div>
    );
  }

  const metadata = document?.metadata;
  const openpechaData = metadata?.openpecha;
  const currentVersion = document?.currentVersion;
  const rootProject = document?.rootProject;

  return (
    <div className="space-y-4 p-3">
      {/* Basic Information */}
      <div>
        <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
          {t(`meta.basicInfo`)}
        </h4>
        <div className="space-y-2">
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`meta.name`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400 break-words">
              {document.name || "Untitled Document"}
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`common.language`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {document.language || "Not specified"}
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`meta.type`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {document.isRoot ? "Root Document" : "Translation"}
            </div>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
          {t(`meta.timeline`)}
        </h4>
        <div className="space-y-2">
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`meta.created`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {formatDate(document.createdAt)}
            </div>
          </div>
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`meta.lastUpdated`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {formatDateTime(document.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Version Information */}
      {currentVersion && (
        <div>
          <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
            {t(`meta.currentVersion`)}
          </h4>
          <div className="space-y-2">
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.label`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {currentVersion.label || "No label"}
              </div>
            </div>
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.versionUpdated`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {formatDateTime(currentVersion.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Information */}
      {rootProject && (
        <div>
          <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
            {t(`meta.project`)}
          </h4>
          <div className="space-y-2">
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.name`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400 break-words">
                {rootProject.name || "Unnamed Project"}
              </div>
            </div>
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.visibility`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {rootProject.isPublic ? "Public" : "Private"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OpenPecha Information */}
      {openpechaData && (
        <div>
          <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
            OpenPecha
          </h4>
          <div className="space-y-2">
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.origin`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {openpechaData.template ? "Yes" : "No"}
              </div>
            </div>
            {openpechaData.expression_id && (
              <div className="text-xs">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  {t(`meta.expressionId`)}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                  {openpechaData.expression_id}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IDs */}
      <div>
        <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">
          {t(`meta.identifiers`)}
        </h4>
        <div className="space-y-2">
          <div className="text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {t(`meta.documentId`)}
            </div>
            <div className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
              {document.id}
            </div>
          </div>
          {document.identifier && (
            <div className="text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {t(`meta.identifier`)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {document.identifier}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({ documentId }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { t } = useTranslation();
  const toggleTab = (tabValue: string) => {
    setActiveTab(activeTab === tabValue ? null : tabValue);
  };

  const tabs = [
    {
      id: "toc",
      icon: BookOpen,
      label: t(`editor.tableOfContents`),
      shortLabel: "Contents",
    },
    {
      id: "metadata",
      icon: Info,
      label: t(`meta.documentInfo`),
      shortLabel: "Info",
    },
    {
      id: "comments",
      icon: MessageCircle,
      label: t(`common.comments`),
      shortLabel: "Comments",
    },
    {
      id: "resources",
      icon: FileText,
      label: t(`common.resources`),
      shortLabel: "Resources",
    },
  ];

  return (
    <div className="flex h-full">
      {/* Vertical Icon Tabs */}
      <div className="w-12 border-r bg-gray-50/50 dark:bg-gray-900/20 flex flex-col">
        <div className="flex flex-col gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleTab(tab.id)}
                className={cn(
                  "h-8 w-8 p-0 flex items-center justify-center",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                title={tab.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content Panel */}
      {activeTab && (
        <div className="w-80 border-r bg-white dark:bg-gray-900 flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-medium text-sm text-gray-800 dark:text-gray-200">
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(null)}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "toc" && (
              <ScrollArea className="h-full">
                <div className="p-3">
                  <TableOfContent documentId={documentId} />
                </div>
              </ScrollArea>
            )}

            {activeTab === "metadata" && (
              <ScrollArea className="h-full">
                <MetadataContent documentId={documentId} />
              </ScrollArea>
            )}

            {activeTab === "comments" && (
              <ScrollArea className="h-full">
                <div className="h-full">
                  <Comments />
                </div>
              </ScrollArea>
            )}
            {activeTab === "resources" && (
              <ScrollArea className="h-full">
                <div className="h-full">
                  <Resources />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSidebar;
