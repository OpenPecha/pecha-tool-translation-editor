import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Camera,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Progress } from "./ui/progress";
import {
  startDocumentWorkflow,
  completeDocumentWorkflow,
  createDocumentSnapshot,
  updateContentDocument,
} from "../api/document";
import { VersionWorkflow } from "../api/version";
import formatTimeAgo from "../lib/formatTimeAgo";
import { useDebounce } from "@uidotdev/usehooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AutoSaveIndicatorProps {
  docId: string;
  isOnline?: boolean;
  lastSavedAt?: Date;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  autoSaveInterval?: number; // in seconds
  onManualSave?: () => void;
  onCreateSnapshot?: () => void;
  className?: string;
  // New props for autosave functionality
  content?: string;
  annotations?: unknown[];
  onContentSaved?: () => void;
}

type SaveStatus = "saved" | "saving" | "error" | "offline" | "unsaved";

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  docId,
  isOnline = true,
  lastSavedAt,
  hasUnsavedChanges = false,
  isSaving = false,
  // autoSaveInterval not used with debounced autosave
  onManualSave,
  onCreateSnapshot,
  className = "",
  content,
  annotations,
  onContentSaved,
}) => {
  const [currentWorkflow, setCurrentWorkflow] =
    useState<VersionWorkflow | null>(null);
  const [isStartingWorkflow, setIsStartingWorkflow] = useState(false);
  const [isCompletingWorkflow, setIsCompletingWorkflow] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Update content mutation
  const updateDocumentMutation = useMutation({
    mutationFn: (content: string) => {
      console.log(
        `🔄 Starting save for document ${docId}, content length: ${content.length}`
      );
      if (!docId) {
        throw new Error("Document ID is required for saving");
      }
      return updateContentDocument(docId, { content });
    },
    onSuccess: (data) => {
      console.log("✅ Document saved successfully:", data);
      onContentSaved?.();
      // Invalidate document query to ensure fresh data on next load
      queryClient.invalidateQueries({
        queryKey: [`document-${docId}`],
      });
    },
    onError: (error) => {
      console.error("❌ Error updating document content:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        docId,
        contentLength: content?.length || 0,
      });
    },
  });

  // Debounced content for autosave
  const debouncedContent = useDebounce(content, 3000);

  // Autosave when debounced content changes
  useEffect(() => {
    if (debouncedContent && debouncedContent.trim() && hasUnsavedChanges) {
      try {
        console.log(
          `💾 Executing autosave - Content length: ${debouncedContent.length}`
        );
        updateDocumentMutation.mutate(debouncedContent);

        // Save annotations to localStorage
        if (annotations && docId) {
          const annotationsKey = `annotations_${docId}`;
          localStorage.setItem(annotationsKey, JSON.stringify(annotations));
          console.log(
            `📝 Saved ${annotations.length} annotations to localStorage`
          );
        }
      } catch (error) {
        console.error("❌ Error in autosave useEffect:", error);
      }
    }
  }, [
    debouncedContent,
    hasUnsavedChanges,
    updateDocumentMutation,
    annotations,
    docId,
  ]);

  // Manual save function
  const handleManualSave = useCallback(() => {
    try {
      if (content && content.trim()) {
        console.log(
          "🚀 Manual save triggered - Content length:",
          content.length
        );
        updateDocumentMutation.mutate(content);

        // Save annotations to localStorage
        if (annotations && docId) {
          const annotationsKey = `annotations_${docId}`;
          localStorage.setItem(annotationsKey, JSON.stringify(annotations));
          console.log(
            `📝 Manual save - saved ${annotations.length} annotations`
          );
        }
      } else {
        console.log(
          "🚀 Manual save triggered - delegating to onManualSave prop"
        );
        onManualSave?.();
      }
    } catch (error) {
      console.error("❌ Error in manual save:", error);
    }
  }, [content, annotations, docId, updateDocumentMutation, onManualSave]);

  // Determine save status
  const getSaveStatus = (): SaveStatus => {
    if (!isOnline) return "offline";
    if (isSaving || updateDocumentMutation.isPending) return "saving";
    if (hasUnsavedChanges) return "unsaved";
    return "saved";
  };

  const status = getSaveStatus();

  // Note: Auto-save countdown removed - now using debounced autosave above

  // Start workflow session
  const handleStartWorkflow = async () => {
    if (isStartingWorkflow || currentWorkflow) return;

    try {
      setIsStartingWorkflow(true);
      const workflow = await startDocumentWorkflow(docId, "editing");
      setCurrentWorkflow(workflow);
    } catch (error) {
      console.error("Failed to start workflow:", error);
    } finally {
      setIsStartingWorkflow(false);
    }
  };

  // Complete workflow session
  const handleCompleteWorkflow = async () => {
    if (!currentWorkflow || isCompletingWorkflow) return;

    try {
      setIsCompletingWorkflow(true);
      await completeDocumentWorkflow(docId, currentWorkflow.id);
      setCurrentWorkflow(null);
    } catch (error) {
      console.error("Failed to complete workflow:", error);
    } finally {
      setIsCompletingWorkflow(false);
    }
  };

  // Create quick snapshot
  const handleQuickSnapshot = async () => {
    if (isCreatingSnapshot) return;

    try {
      setIsCreatingSnapshot(true);
      const timestamp = new Date().toLocaleString();
      await createDocumentSnapshot(
        docId,
        `Quick snapshot - ${timestamp}`,
        "Manual snapshot created from auto-save indicator"
      );
      onCreateSnapshot?.();
    } catch (error) {
      console.error("Failed to create snapshot:", error);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Get status display info
  const getStatusInfo = () => {
    switch (status) {
      case "saved":
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: "Saved",
          color: "text-green-600",
          bgColor: "bg-green-50",
          description: lastSavedAt
            ? `Last saved ${formatTimeAgo(lastSavedAt)}`
            : "All changes saved",
        };
      case "saving":
        return {
          icon: <Activity className="w-4 h-4 text-blue-600 animate-spin" />,
          text: "Saving...",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          description: "Saving your changes",
        };
      case "unsaved":
        return {
          icon: <Clock className="w-4 h-4 text-orange-600" />,
          text: "Unsaved",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          description: "Auto-save pending",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          text: "Error",
          color: "text-red-600",
          bgColor: "bg-red-50",
          description: "Failed to save changes",
        };
      case "offline":
        return {
          icon: <WifiOff className="w-4 h-4 text-gray-600" />,
          text: "Offline",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          description: "Changes will be saved when online",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const progressValue = 0; // No countdown progress needed with debounced autosave

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main status indicator */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 px-3 py-1 h-8 ${statusInfo.bgColor} hover:${statusInfo.bgColor} ${statusInfo.color} border border-gray-200`}
          >
            {statusInfo.icon}
            <span className="text-sm font-medium">{statusInfo.text}</span>
            {/* Countdown badge removed - using debounced autosave */}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-1">Auto-Save Status</h3>
              <p className="text-sm text-gray-600">{statusInfo.description}</p>
              {status === "unsaved" && (
                <div className="mt-2">
                  <Progress value={progressValue} className="h-2" />
                </div>
              )}
            </div>

            {/* Connection status */}
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-gray-600">Connection</span>
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Workflow status */}
            <div className="py-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Editing Session</span>
                {currentWorkflow ? (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>

              {currentWorkflow ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    Started {formatTimeAgo(currentWorkflow.startedAt)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentWorkflow.totalChanges} changes •{" "}
                    {currentWorkflow.autoSaveCount} auto-saves
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCompleteWorkflow}
                    disabled={isCompletingWorkflow}
                    className="w-full"
                  >
                    {isCompletingWorkflow ? "Completing..." : "End Session"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartWorkflow}
                  disabled={isStartingWorkflow}
                  className="w-full"
                >
                  {isStartingWorkflow ? "Starting..." : "Start Session"}
                </Button>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSave}
                disabled={!hasUnsavedChanges || isSaving || !isOnline}
                className="flex-1 gap-1"
              >
                <Save className="w-3 h-3" />
                Save Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickSnapshot}
                disabled={isCreatingSnapshot || !isOnline}
                className="flex-1 gap-1"
              >
                <Camera className="w-3 h-3" />
                {isCreatingSnapshot ? "Creating..." : "Snapshot"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Connection indicator */}
      <div className="flex items-center">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
      </div>

      {/* Workflow indicator */}
      {currentWorkflow && (
        <Badge variant="default" className="text-xs">
          Session Active
        </Badge>
      )}
    </div>
  );
};

export default AutoSaveIndicator;
