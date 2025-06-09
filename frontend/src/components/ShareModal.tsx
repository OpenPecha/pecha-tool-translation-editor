import React, { useState } from "react";
import { X, UserPlus, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addUserToProjectByEmail,
  fetchProjectPermissions,
  removeUserFromProject,
  updateUserProjectPermission,
} from "@/api/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/use-auth-hook";
import ExportButton from "./Export";

interface User {
  id: string;
  username: string;
  email?: string;
}

interface ProjectPermission {
  id: string;
  userId: string;
  canRead: boolean;
  canWrite: boolean;
  user?: User;
}

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
  const [email, setEmail] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"share" | "export">("share");
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Fetch project permissions
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["projectPermissions", projectId],
    queryFn: () => fetchProjectPermissions(projectId),
  });

  const owner = permissionsData?.data?.owner;
  const permissions: ProjectPermission[] =
    permissionsData?.data?.permissions || [];

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: () => addUserToProjectByEmail(projectId, email, canWrite),
    onSuccess: () => {
      setSuccess(`User ${email} has been added to the project`);
      setEmail("");
      setCanWrite(false);
      setError("");
      // Invalidate permissions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["projectPermissions", projectId],
      });
      // Wait 3 seconds and clear success message
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to add user to project");
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => removeUserFromProject(projectId, userId),
    onSuccess: () => {
      setSuccess("User has been removed from the project");
      // Invalidate permissions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["projectPermissions", projectId],
      });
      // Wait 3 seconds and clear success message
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to remove user from project");
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: ({ userId, canWrite }: { userId: string; canWrite: boolean }) =>
      updateUserProjectPermission(projectId, userId, canWrite),
    onSuccess: () => {
      setSuccess("Permission updated successfully");
      // Invalidate permissions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["projectPermissions", projectId],
      });
      // Wait 3 seconds and clear success message
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to update permission");
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    addUserMutation.mutate();
  };

  const handleRemoveUser = (userId: string) => {
    if (
      confirm("Are you sure you want to remove this user from the project?")
    ) {
      removeUserMutation.mutate(userId);
    }
  };

  const handlePermissionChange = (userId: string, newCanWrite: boolean) => {
    updatePermissionMutation.mutate({ userId, canWrite: newCanWrite });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-lg font-semibold">Share Project</div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "share"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("share")}
            >
              Share
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "export"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("export")}
            >
              Export
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "share" ? (
            <div className="p-4 space-y-4">
              {/* Add user form */}
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Add user by email
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={addUserMutation.isPending}
                      className="whitespace-nowrap"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="canWrite"
                      checked={canWrite}
                      onChange={(e) => setCanWrite(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="canWrite" className="text-sm text-gray-700">
                      Can edit (otherwise, read-only access)
                    </Label>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    {success}
                  </div>
                )}
              </form>

              {/* Users list */}
              <div className="space-y-2">
                {permissions.filter((p) => p.userId !== currentUser?.id)
                  .length > 0 && (
                  <>
                    <div className="text-sm font-medium text-gray-500">
                      Collaborators
                    </div>
                    {owner && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {owner.username?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-medium">
                              {owner.id === currentUser?.id
                                ? "Me"
                                : owner.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              {owner.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                          Owner
                        </div>
                      </div>
                    )}
                    {permissions
                      .filter((p) => p.userId !== currentUser?.id)
                      .map((permission: ProjectPermission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-medium">
                              {permission.user?.username
                                ?.charAt(0)
                                .toUpperCase() ?? "U"}
                            </div>
                            <div>
                              <div className="font-medium">
                                {permission.user?.id === currentUser?.id
                                  ? "Me"
                                  : permission.user?.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.user?.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`canWrite-${permission.id}`}
                                checked={permission.canWrite}
                                onChange={(e) =>
                                  handlePermissionChange(
                                    permission.userId,
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label
                                htmlFor={`canWrite-${permission.id}`}
                                className="text-sm text-gray-700"
                              >
                                Can edit
                              </Label>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveUser(permission.userId)
                              }
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </>
                )}

                {permissions.filter((p) => p.userId !== currentUser?.id)
                  .length === 0 &&
                  !isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No collaborators yet. Add users by email to collaborate.
                    </div>
                  )}

                {isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Loading permissions...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 flex flex-col  h-full">
              <ExportButton projectId={projectId} projectName={projectName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
