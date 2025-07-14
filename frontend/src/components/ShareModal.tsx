import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Users,
  Globe,
  Lock,
  Copy,
  UserPlus,
  ChevronDown,
  Settings,
  Trash2,
  CheckCircle,
  Search,
  Send,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/auth/use-auth-hook";
import { useTranslate } from "@tolgee/react";
import ExportButton from "./Export";
import {
  getProjectShareInfo,
  updateProjectShareSettings,
  addCollaborator,
  updateCollaboratorAccess,
  removeCollaborator,
  searchUsers,
  type ProjectShareInfo,
  type Collaborator,
  type User,
} from "@/api/project";

interface ShareModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"share" | "export">("share");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"viewer" | "editor" | "admin">(
    "viewer"
  );
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useTranslate();

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
      accessLevel: "viewer" | "editor" | "admin";
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
      accessLevel: "viewer" | "editor" | "admin";
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
    newAccessLevel: "viewer" | "editor" | "admin"
  ) => {
    updateAccessMutation.mutate({ userId, accessLevel: newAccessLevel });
  };

  // Handle public access toggle
  const handlePublicToggle = (isPublic: boolean) => {
    updateShareMutation.mutate({
      isPublic,
      publicAccess: isPublic ? "viewer" : "none",
    });
  };

  // Handle public access level change
  const handlePublicAccessChange = (publicAccess: "viewer" | "editor") => {
    updateShareMutation.mutate({
      isPublic: true,
      publicAccess,
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
      case "admin":
        return "Can manage";
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
      case "admin":
        return "bg-purple-100 text-purple-800";
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Share "{projectName}"</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="p-4 border-b">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Share Tab */}
          <TabsContent
            value="share"
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* People with Access */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  People with Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add people section */}
                {shareData?.isOwner && (
                  <div className="space-y-3">
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
                          className="pr-10 text-sm"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>

                      <Select
                        value={accessLevel}
                        onValueChange={(value) => setAccessLevel(value as any)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => handleAddCollaborator(email)}
                        disabled={!email || addCollaboratorMutation.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Search Results */}
                    {showUserSearch && searchResults.length > 0 && (
                      <Card className="p-2">
                        <div className="max-h-28 overflow-y-auto">
                          {searchResults.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => {
                                setEmail(user.email);
                                setShowUserSearch(false);
                              }}
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.picture} />
                                <AvatarFallback>
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
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
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={owner.picture} />
                      <AvatarFallback>
                        {owner.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{owner.username}</p>
                      <p className="text-xs text-gray-600">{owner.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                    >
                      Owner
                    </Badge>
                  </div>
                )}

                {/* Collaborators */}
                {collaborators.length > 0 && (
                  <div className="space-y-2">
                    {collaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={collaborator.user.picture} />
                          <AvatarFallback>
                            {collaborator.user.username
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {collaborator.user.username}
                          </p>
                          <p className="text-xs text-gray-600">
                            {collaborator.user.email}
                          </p>
                        </div>

                        {shareData?.isOwner ? (
                          <div className="flex items-center gap-2">
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
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveCollaborator(collaborator.userId)
                              }
                              disabled={removeCollaboratorMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            className={getAccessLevelColor(
                              collaborator.accessLevel
                            )}
                          >
                            {getAccessLevelLabel(collaborator.accessLevel)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {collaborators.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No collaborators yet</p>
                    <p className="text-xs">
                      Add people by email to collaborate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* General Access Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  General Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {shareData?.isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {shareData?.isPublic
                          ? "Anyone with the link"
                          : "Restricted"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {shareData?.isPublic
                          ? "Public access to root document"
                          : "Invited people only"}
                      </p>
                    </div>
                  </div>
                  {shareData?.isOwner && (
                    <Switch
                      checked={shareData?.isPublic}
                      onCheckedChange={handlePublicToggle}
                      disabled={updateShareMutation.isPending}
                    />
                  )}
                </div>

                {shareData?.isPublic && (
                  <div className="ml-7 space-y-3">
                    <Select
                      value={shareData.publicAccess}
                      onValueChange={(value) =>
                        handlePublicAccessChange(value as "viewer" | "editor")
                      }
                      disabled={
                        !shareData?.isOwner || updateShareMutation.isPending
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>

                    {shareData.shareableLink && (
                      <div className="space-y-2">
                        {shareData.rootDocument && (
                          <div className="text-xs text-gray-600">
                            <strong>Sharing:</strong> {shareData.rootDocument.name}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={shareData.shareableLink}
                            readOnly
                            className="flex-1 text-sm"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(shareData.shareableLink!)
                            }
                            disabled={copied}
                          >
                            {copied ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 p-4">
            <ExportButton projectId={projectId} projectName={projectName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShareModal;
