import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Users,
  Globe,
  Lock,
  Copy,
  Trash2,
  CheckCircle,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExportButton from "./Export";
import {
  getProjectShareInfo,
  updateProjectShareSettings,
  addCollaborator,
  updateCollaboratorAccess,
  removeCollaborator,
  searchUsers,
  type User,
} from "@/api/project";

interface ShareModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

// Helper function to generate shareable link client-side
const generateShareableLink = (
  rootDocument: { id: string } | null | undefined
): string | null => {
  if (!rootDocument) return null;
  const baseUrl = window.location.origin;
  return `${baseUrl}/documents/public/${rootDocument.id}`;
};

const ShareModal: React.FC<ShareModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"share" | "export">("share");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"viewer" | "editor">("viewer");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  // Fetch project sharing information
  const { data: shareInfo, isLoading } = useQuery({
    queryKey: ["projectShare", projectId],
    queryFn: () => getProjectShareInfo(projectId),
    retry: 1,
  });

  // Update sharing settings mutation
  const updateShareMutation = useMutation({
    mutationFn: ({
      isPublic,
      publicAccess,
    }: {
      isPublic: boolean;
      publicAccess: "none" | "viewer" | "editor";
    }) => updateProjectShareSettings(projectId, { isPublic, publicAccess }),
    onSuccess: (data) => {
      const message = data.data.isPublic
        ? "Document is now public and accessible via link"
        : "Document is now private";
      setSuccess(message);
      queryClient.invalidateQueries({ queryKey: ["projectShare", projectId] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    },
  });

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: ({
      email,
      accessLevel,
    }: {
      email: string;
      accessLevel: "viewer" | "editor";
    }) => addCollaborator(projectId, { email, accessLevel }),
    onSuccess: (data) => {
      setSuccess(data.message);
      setEmail("");
      setAccessLevel("viewer");
      setShowUserSearch(false);
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ["projectShare", projectId] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    },
  });

  // Update collaborator access mutation
  const updateAccessMutation = useMutation({
    mutationFn: ({
      userId,
      accessLevel,
    }: {
      userId: string;
      accessLevel: "viewer" | "editor";
    }) => updateCollaboratorAccess(projectId, userId, accessLevel),
    onSuccess: () => {
      setSuccess("Access level updated");
      queryClient.invalidateQueries({ queryKey: ["projectShare", projectId] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: (userId: string) => removeCollaborator(projectId, userId),
    onSuccess: (data) => {
      setSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["projectShare", projectId] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    },
  });

  // Search users for collaboration
  const searchUsersMutation = useMutation({
    mutationFn: (query: string) => searchUsers(query),
    onSuccess: (data) => {
      setSearchResults(data.data);
      setIsSearching(false);
    },
    onError: (error: Error) => {
      setError(error.message);
      setIsSearching(false);
      setTimeout(() => setError(""), 5000);
    },
  });

  // Handle email input change with debounced search
  useEffect(() => {
    if (email.length > 2) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        searchUsersMutation.mutate(email);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowUserSearch(false);
    }
  }, [email]);

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setSuccess("Link copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Failed to copy link to clipboard");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Handle adding collaborator
  const handleAddCollaborator = (userEmail: string) => {
    addCollaboratorMutation.mutate({ email: userEmail, accessLevel });
  };

  // Handle removing collaborator
  const handleRemoveCollaborator = (userId: string) => {
    if (confirm("Are you sure you want to remove this collaborator?")) {
      removeCollaboratorMutation.mutate(userId);
    }
  };

  // Handle access level change
  const handleAccessLevelChange = (
    userId: string,
    newAccessLevel: "viewer" | "editor"
  ) => {
    updateAccessMutation.mutate({ userId, accessLevel: newAccessLevel });
  };

  // Handle public access toggle with optimistic UI update
  const handlePublicToggle = (isPublic: boolean) => {
    // Generate and copy link immediately on client side
    if (isPublic && shareData?.rootDocument) {
      const clientGeneratedLink = generateShareableLink(shareData.rootDocument);
      if (clientGeneratedLink) {
        copyToClipboard(clientGeneratedLink);
      }
    }

    // Update backend for data persistence
    updateShareMutation.mutate({
      isPublic,
      publicAccess: isPublic ? "viewer" : "none",
    });
  };

  const shareData = shareInfo?.data;
  const collaborators =
    shareData?.permissions?.filter(
      (permission) => permission.userId !== shareData?.owner?.id
    ) || [];
  const owner = shareData?.owner;

  // Access level display helpers
  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case "viewer":
        return "Can view";
      case "editor":
        return "Can edit";
      default:
        return "Can view";
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "viewer":
        return "bg-blue-100 text-blue-800";
      case "editor":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">
              Loading sharing options...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold">Share "{projectName}"</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error/Success Messages - Now handled in General Access section */}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Share Tab */}
          <TabsContent
            value="share"
            className="flex-1 overflow-y-auto p-6 space-y-3 "
          >
            {/* People with Access */}
              <div className="pb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  People with Access
                </div>
              </div>
              <div className="space-y-2">
                {/* Add people section */}
                {shareData?.isOwner && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Add people by email..."
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setShowUserSearch(true);
                          }}
                          onFocus={() => setShowUserSearch(true)}
                          className="pr-10 text-sm h-8"
                        />
                        {isSearching && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>

                      <Select
                        value={accessLevel}
                        onValueChange={(value) => setAccessLevel(value as any)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => handleAddCollaborator(email)}
                        disabled={!email || addCollaboratorMutation.isPending}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Search Results */}
                    {showUserSearch && searchResults.length > 0 && (
                      <Card className="p-1">
                        <div className="max-h-20 overflow-y-auto">
                          {searchResults.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => {
                                setEmail(user.email);
                                setShowUserSearch(false);
                              }}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.picture} />
                                <AvatarFallback className="text-xs">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* Owner */}
                {owner && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={owner.picture} />
                      <AvatarFallback className="text-xs">
                        {owner.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {owner.username}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {owner.email}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-0"
                    >
                      Owner
                    </Badge>
                  </div>
                )}

                {/* Collaborators */}
                {collaborators.length > 0 && (
                  <div className="space-y-1">
                    {collaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={collaborator.user.picture} />
                          <AvatarFallback className="text-xs">
                            {collaborator.user.username
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">
                            {collaborator.user.username}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {collaborator.user.email}
                          </p>
                        </div>

                        {shareData?.isOwner ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={collaborator.accessLevel}
                              onValueChange={(value) =>
                                handleAccessLevelChange(
                                  collaborator.userId,
                                  value as any
                                )
                              }
                              disabled={updateAccessMutation.isPending}
                            >
                              <SelectTrigger className="w-20 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveCollaborator(collaborator.userId)
                              }
                              disabled={removeCollaboratorMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            className={`${getAccessLevelColor(
                              collaborator.accessLevel
                            )} text-xs px-2 py-0`}
                          >
                            {getAccessLevelLabel(collaborator.accessLevel)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {collaborators.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                    <p className="text-xs">No collaborators yet</p>
                  </div>
                )}
              </div>

            {/* General Access Section - Enhanced */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">General access</span>
                </div>
                {shareData?.isOwner && (
                  <Select
                    value={shareData?.isPublic ? "public" : "private"}
                    onValueChange={(value) =>
                      handlePublicToggle(value === "public")
                    }
                    disabled={updateShareMutation.isPending}
                  >
                    <SelectTrigger className="h-8 text-sm w-auto min-w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3" />
                          <span>Private</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <span>Public</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {!shareData?.isOwner && (
                  <Badge variant="outline" className="text-sm h-8 px-3">
                    {shareData?.isPublic ? "Public" : "Private"}
                  </Badge>
                )}
              </div>
              
              
              
              {/* Shareable Link - Enhanced */}
              {shareData?.isPublic && shareData?.rootDocument && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={
                        generateShareableLink(shareData.rootDocument) || ""
                      }
                      readOnly
                      className="text-xs h-8 bg-gray-50 border-gray-200 text-gray-700 cursor-default select-all focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = generateShareableLink(
                          shareData.rootDocument
                        );
                        if (link) copyToClipboard(link);
                      }}
                      className="h-8 px-3 shrink-0 hover:bg-gray-100"
                      title="Copy link"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {(error || success) && (
                <div className="text-sm">
                  {error && (
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-md">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{success}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 p-6">
            <ExportButton projectId={projectId} projectName={projectName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShareModal;
