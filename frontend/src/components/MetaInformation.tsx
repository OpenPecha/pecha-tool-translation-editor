import { Button } from "./ui/button";
import { useState } from "react";
import {
  Info,
  Calendar,
  User,
  FileText,
  Globe,
  Clock,
  Hash,
  Tag,
  LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { fetchDocument } from "@/api/document";
import { useQuery } from "@tanstack/react-query";

interface MetaInformationContentProps {
  documentId: string;
}

const MetaDataItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <Icon className="w-4 h-4 mt-0.5 text-gray-500" />
    <div className="flex-1 min-w-0">
      <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </dt>
      <dd className="text-sm text-gray-600 dark:text-gray-400 break-words">
        {value}
      </dd>
    </div>
  </div>
);

const MetaInformation: React.FC<MetaInformationContentProps> = ({
  documentId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: document,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId),
    enabled: !!documentId,
  });

  const handleToggleModal = () => {
    setIsOpen(!isOpen);
  };

  // Extract metadata
  const metadata = document?.metadata;
  const openpechaData = metadata?.openpecha;
  const currentVersion = document?.currentVersion;
  const rootProject = document?.rootProject;

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

  return (
    <>
      <Button
        onClick={handleToggleModal}
        className="top-3 p-3 z-2"
        aria-label="Document Meta Information"
        size="sm"
        variant="outline"
      >
        <Info className="w-5 h-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Information
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                Loading document information...
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                Error loading document information. Please try again.
              </p>
            </div>
          )}

          {document && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetaDataItem
                    icon={FileText}
                    label="Document Name"
                    value={document.name || "Untitled Document"}
                  />
                  <MetaDataItem
                    icon={Hash}
                    label="Document ID"
                    value={document.id}
                  />
                  <MetaDataItem
                    icon={Hash}
                    label="Identifier"
                    value={document.identifier || "N/A"}
                  />
                  <MetaDataItem
                    icon={Globe}
                    label="Language"
                    value={document.language || "Not specified"}
                  />
                </div>
              </div>

              {/* Document Status */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  Document Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetaDataItem
                    icon={Tag}
                    label="Document Type"
                    value={document.isRoot ? "Root Document" : "Translation"}
                  />
                  {document.rootId && (
                    <MetaDataItem
                      icon={FileText}
                      label="Root Document ID"
                      value={document.rootId}
                    />
                  )}
                  <MetaDataItem
                    icon={Calendar}
                    label="Created"
                    value={formatDate(document.createdAt)}
                  />
                  <MetaDataItem
                    icon={Clock}
                    label="Last Updated"
                    value={formatDateTime(document.updatedAt)}
                  />
                </div>
              </div>

              {/* Current Version Information */}
              {currentVersion && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Version Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetaDataItem
                      icon={Tag}
                      label="Version ID"
                      value={currentVersion.id}
                    />
                    <MetaDataItem
                      icon={FileText}
                      label="Version Label"
                      value={currentVersion.label || "No label"}
                    />
                    <MetaDataItem
                      icon={Calendar}
                      label="Version Created"
                      value={formatDateTime(currentVersion.createdAt)}
                    />
                    <MetaDataItem
                      icon={Clock}
                      label="Version Updated"
                      value={formatDateTime(currentVersion.updatedAt)}
                    />
                  </div>
                </div>
              )}

              {/* Project Information */}
              {rootProject && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Project Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetaDataItem
                      icon={FileText}
                      label="Project Name"
                      value={rootProject.name || "Unnamed Project"}
                    />
                    <MetaDataItem
                      icon={Hash}
                      label="Project ID"
                      value={document.rootProjectId}
                    />
                    <MetaDataItem
                      icon={Globe}
                      label="Public Access"
                      value={rootProject.isPublic ? "Public" : "Private"}
                    />
                    {rootProject.publicAccess && (
                      <MetaDataItem
                        icon={User}
                        label="Access Level"
                        value={
                          rootProject.publicAccess === "viewer"
                            ? "View Only"
                            : "Collaborative"
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {/* OpenPecha Metadata */}
              {openpechaData && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    OpenPecha Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetaDataItem
                      icon={Tag}
                      label="OpenPecha Origin"
                      value={openpechaData.template ? "Yes" : "No"}
                    />
                    {openpechaData.template && (
                      <MetaDataItem
                        icon={FileText}
                        label="Template"
                        value={openpechaData.template}
                      />
                    )}
                    {openpechaData.manifestation_id && (
                      <MetaDataItem
                        icon={Hash}
                        label="Manifestation ID"
                        value={openpechaData.manifestation_id}
                      />
                    )}
                    {openpechaData.expression_id && (
                      <MetaDataItem
                        icon={Hash}
                        label="Expression ID"
                        value={openpechaData.expression_id}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Additional Metadata */}
              {metadata && Object.keys(metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Additional Metadata
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MetaInformation;
