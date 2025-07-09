import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  FolderOpen,
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Eye,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { accessSharedProject } from "@/api/project";

const PublicProjectViewer: React.FC = () => {
  const { shareLink } = useParams<{ shareLink: string }>();
  const navigate = useNavigate();

  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sharedProject", shareLink],
    queryFn: () => accessSharedProject(shareLink!),
    enabled: !!shareLink,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared project...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              This project is either private, doesn't exist, or the link has
              expired.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/">Go to App</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projectData.data;
  const accessLevel = project.publicAccess;
  const canEdit = project.canEdit;
  const isReadOnly = project.isReadOnly;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Link>
              </Button>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Public {accessLevel === "editor" ? "Editor" : "Viewer"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && <Badge variant="secondary">Can Edit</Badge>}
              {isReadOnly && <Badge variant="outline">Read Only</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Created by {project.owner.username}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(project.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{project.roots?.length || 0} documents</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Description/Metadata */}
          {project.metadata?.description && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-gray-700">{project.metadata.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Access Notice */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Globe className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              You have {accessLevel} access to this project.
              {isReadOnly
                ? " You can view all documents but cannot make changes."
                : " You can view and edit documents in this project."}
            </AlertDescription>
          </Alert>
        </div>

        {/* Documents List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Documents</h2>
            <div className="text-sm text-gray-600">
              {project.roots?.length || 0} document
              {(project.roots?.length || 0) !== 1 ? "s" : ""} available
            </div>
          </div>

          {!project.roots || project.roots.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Documents
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  This project doesn't contain any documents yet, or they may
                  not be publicly accessible.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {project.roots.map((doc: any) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-md transition-all duration-200 border border-gray-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-lg">
                            {doc.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="capitalize">
                              {doc.language || "Unknown language"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Updated{" "}
                                {new Date(doc.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {accessLevel === "editor" ? "Can Edit" : "View Only"}
                        </Badge>

                        <Button asChild size="sm">
                          <Link
                            to={`/documents/public/${doc.id}`}
                            className="flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Project Owner Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Project Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={project.owner.picture} />
                <AvatarFallback>
                  {project.owner.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">
                  {project.owner.username}
                </p>
                <p className="text-sm text-gray-600">Project Creator</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProjectViewer;
