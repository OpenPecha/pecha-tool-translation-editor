import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchApiCredentials,
  createApiCredential,
  updateApiCredential,
  deleteApiCredential,
  ApiCredential,
  ApiCredentialInput,
} from "@/api/apiCredentials";
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
import { Trash2, Edit, Plus, Key, Check, X, Eye, EyeOff } from "lucide-react";

const ApiCredentials: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApiCredentialInput>({
    provider: "",
    apiKey: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch API credentials
  const {
    data: credentials,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["apiCredentials"],
    queryFn: fetchApiCredentials,
  });

  // Create API credential mutation
  const createMutation = useMutation({
    mutationFn: createApiCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiCredentials"] });
      setIsAdding(false);
      setFormData({ provider: "", apiKey: "" });
      setStatusMessage({
        text: "API credential created successfully",
        type: "success",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: Error) => {
      setStatusMessage({
        text: error.message ?? "Failed to create API credential",
        type: "error",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  // Update API credential mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ApiCredentialInput>;
    }) => updateApiCredential(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiCredentials"] });
      setIsEditing(null);
      setFormData({ provider: "", apiKey: "" });
      setStatusMessage({
        text: "API credential updated successfully",
        type: "success",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: Error) => {
      setStatusMessage({
        text: error.message ?? "Failed to update API credential",
        type: "error",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  // Delete API credential mutation
  const deleteMutation = useMutation({
    mutationFn: deleteApiCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiCredentials"] });
      setStatusMessage({
        text: "API credential deleted successfully",
        type: "success",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: Error) => {
      setStatusMessage({
        text: error.message ?? "Failed to delete API credential",
        type: "error",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProviderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, provider: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider || !formData.apiKey) {
      setStatusMessage({
        text: "Provider and API key are required",
        type: "error",
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: isEditing, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (credential: ApiCredential) => {
    setIsEditing(credential.id);

    // Use the existing API function to fetch the credential details
    // This ensures we use the same authentication mechanism as other API calls
    import("@/api/apiCredentials")
      .then((module) => {
        // Dynamically import and use the fetchApiCredential function
        return module.fetchApiCredential(credential.id);
      })
      .then((data) => {
        if (data && typeof data === "object") {
          setFormData({
            provider: data.provider || "",
            apiKey: data.apiKey || "", // Now we have the actual API key
          });
          setShowApiKey(false); // Default to hiding the key
        } else {
          throw new Error("Invalid response format");
        }
      })
      .catch((error) => {
        console.error("Error fetching credential:", error);
        setStatusMessage({
          text: error.message ?? "Error fetching credential details",
          type: "error",
        });
        setTimeout(() => setStatusMessage(null), 3000);
      });
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this API credential?")
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(null);
    setFormData({ provider: "", apiKey: "" });
  };

  if (isLoading) {
    return <div className="p-4">Loading API credentials...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">Error loading API credentials</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">API Credentials</h2>
        {!isAdding && !isEditing && (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            Add
          </Button>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-2 rounded-md ${
            statusMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {(isAdding || isEditing) && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border p-3 rounded-md"
        >
          <div>
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="deepl">DeepL</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                name="apiKey"
                type={showApiKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="Enter your API key"
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                {formData.apiKey
                  ? "Leave unchanged to keep current key"
                  : "Loading key..."}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              size="sm"
              className="flex items-center gap-1"
            >
              <X size={16} />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex items-center gap-1"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Check size={16} />
              {isEditing ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {!isAdding && !isEditing && credentials && credentials.length === 0 && (
        <div className="text-center p-4 border rounded-md bg-gray-50">
          <Key className="mx-auto h-8 w-8 text-gray-500 mb-2" />
          <p className="text-gray-500">No API credentials added yet</p>
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Add your first API credential
          </Button>
        </div>
      )}

      {!isAdding && !isEditing && credentials && credentials.length > 0 && (
        <div className="space-y-2">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="flex justify-between items-center p-3 border rounded-md"
            >
              <div>
                <div className="font-medium capitalize">
                  {credential.provider}
                </div>
                <div className="text-sm text-gray-500">
                  Added on {new Date(credential.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(credential)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  onClick={() => handleDelete(credential.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiCredentials;
