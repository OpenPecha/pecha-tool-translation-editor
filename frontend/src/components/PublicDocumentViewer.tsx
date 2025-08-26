import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Globe, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { fetchPublicDocument } from "@/api/document";
import { useAuth } from "@/auth/use-auth-hook";
import { EditorProvider } from "@/contexts/EditorContext";
import { CommentProvider } from "@/contexts/CommentContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import { createPortal } from "react-dom";
import { IoIosArrowForward } from "react-icons/io";

import DocumentEditor from "./DocumentEditor";
import PublicSideMenu from "./PublicSideMenu";

interface PublicDocumentViewerProps {
  documentId?: string;
}

const PublicDocumentEditor = memo(
  ({ docId, currentDoc }: { docId: string | undefined; currentDoc: any }) => {
    return (
      <DocumentEditor
        docId={docId}
        isEditable={false}
        currentDoc={currentDoc}
      />
    );
  }
);

const PublicDocumentViewer: React.FC<PublicDocumentViewerProps> = ({
  documentId: propDocumentId,
}) => {
  const { id: paramDocumentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const documentId = propDocumentId || paramDocumentId;

  // Use URL parameters for selected translation
  const { selectedTranslationId, setSelectedTranslationId, clearSelectedTranslationId } = useTranslationSidebarParams();

  // Handle translation selection
  const handleSelectTranslation = useCallback(
    (translationId: string | null) => {
      setSelectedTranslationId(translationId);
    },
    [setSelectedTranslationId]
  );

  // Fetch public document
  const {
    data: documentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publicDocument", documentId],
    queryFn: () => fetchPublicDocument(documentId!),
    enabled: !!documentId,
    retry: 1,
  });

  const handleBackToApp = useCallback(() => {
    if (isAuthenticated) {
      navigate("/");
    } else {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Create portal containers exactly like in the main app
  useEffect(() => {
    const ensurePortalContainer = (id: string) => {
      if (!window.document.getElementById(id)) {
        const container = window.document.createElement("div");
        container.id = id;
        window.document.body.appendChild(container);
      }
    };

    ensurePortalContainer("navbar");
    ensurePortalContainer("toolbar-container");
    ensurePortalContainer("counter");
    ensurePortalContainer("sync-option");

    return () => {
      // Cleanup on unmount
      const containers = [
        "navbar",
        "toolbar-container",
        "counter",
        "sync-option",
      ];
      containers.forEach((id) => {
        const element = window.document.getElementById(id);
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Loading Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                This document is not publicly accessible or doesn't exist.
                Please check the link or contact the document owner.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleBackToApp}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isAuthenticated ? "Back to Dashboard" : "Go to Login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create a project object similar to DocumentWrapper
  const project = {
    id: documentData?.rootProjectId,
    name: documentData?.rootProject?.name || "Public Document",
  };

  return (
    <EditorProvider>
      <CommentProvider>
        <FootNoteProvider>
          {/* Navbar rendered in portal - exactly like DocumentWrapper */}
          {createPortal(
            <PublicNavbar
              document={documentData}
              project={project}
              onBackToApp={handleBackToApp}
              selectedTranslationId={selectedTranslationId}
            />,
            window.document.getElementById("navbar")!
          )}

          {/* Main editor container - exactly like DocumentWrapper */}
          <div className="grid grid-rows-[1fr] h-full">
            <div className="relative flex px-2 w-full overflow-hidden">
              <PublicDocumentEditor
                docId={documentId}
                currentDoc={documentData}
              />
              {/* Conditionally render side menu or translation editor */}
              {!selectedTranslationId ? (
                <PublicSideMenu
                  documentId={documentId!}
                  onSelectTranslation={handleSelectTranslation}
                />
              ) : (
                <PublicTranslationEditor
                  selectedTranslationId={selectedTranslationId}
                  onClose={() => handleSelectTranslation(null)}
                />
              )}
            </div>
          </div>
        </FootNoteProvider>
      </CommentProvider>
    </EditorProvider>
  );
};

// Translation Editor Component for Public View
const PublicTranslationEditor: React.FC<{
  selectedTranslationId: string;
  onClose: () => void;
}> = ({ selectedTranslationId, onClose }) => {
  const { currentDoc } = useCurrentDoc(selectedTranslationId);

  return (
    <div className="flex-1 relative w-full flex group">
      <div className="relative h-full">
        {/* Vertical Line (hidden by default, shows on hover) */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        {/* Arrow (hidden by default, shows on hover) */}
        <button
          className="absolute bg-white border z-[99] cursor-pointer rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-700 text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={onClose}
          aria-label="Close translation view"
          title="Close translation view"
          type="button"
        >
          <IoIosArrowForward />
        </button>
      </div>
      <PublicDocumentEditor
        docId={selectedTranslationId}
        currentDoc={currentDoc}
      />
    </div>
  );
};

// Custom navbar for public view
const PublicNavbar: React.FC<{
  document: any;
  project: any;
  onBackToApp: () => void;
  selectedTranslationId: string | null;
}> = ({ document, project, onBackToApp, selectedTranslationId }) => {
  const { isAuthenticated } = useAuth();
  const { currentDoc: translationDoc } = useCurrentDoc(
    selectedTranslationId || undefined,
    true
  );

  // Show translation info if viewing a translation
  const displayDocument = selectedTranslationId ? translationDoc : document;
  const isViewingTranslation = !!selectedTranslationId;

  return (
    <div className="bg-white border-b mb-3">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {displayDocument?.name || "Document"}
                {isViewingTranslation && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Translation)
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Public Document
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Read-Only
                </Badge>
                {displayDocument?.language && (
                  <Badge variant="outline" className="text-xs">
                    {displayDocument.language.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button onClick={onBackToApp} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isAuthenticated ? "Back to Dashboard" : "Sign In to Collaborate"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicDocumentViewer;
