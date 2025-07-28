import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Save,
  Camera,
  RotateCcw,
  GitBranch,
  Tag,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Activity,
} from "lucide-react";
import {
  fetchDocumentVersions,
  createDocumentSnapshot,
  restoreVersion,
  getVersionDiff,
  Version,
  VersionDiff,
} from "../api/version";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { formatTimeAgo } from "../lib/formatTimeAgo";
import { formatDate } from "../lib/formatDate";

interface VersionManagerProps {
  docId: string;
  onVersionRestore?: (version: Version) => void;
  onSnapshotCreated?: (version: Version) => void;
  currentVersionId?: string;
  className?: string;
}

interface SnapshotDialogProps {
  docId: string;
  onSnapshotCreated: (version: Version) => void;
}

const SnapshotDialog: React.FC<SnapshotDialogProps> = ({
  docId,
  onSnapshotCreated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [reason, setReason] = useState("");
  const [tags, setTags] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSnapshot = async () => {
    if (!label.trim()) return;

    setIsCreating(true);
    try {
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const snapshot = await createDocumentSnapshot(
        docId,
        label,
        reason || undefined,
        tagList
      );
      onSnapshotCreated(snapshot);
      setIsOpen(false);
      setLabel("");
      setReason("");
      setTags("");
    } catch (error) {
      console.error("Failed to create snapshot:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="w-4 h-4" />
          Create Snapshot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Version Snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Snapshot Label *</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Chapter 1 Complete"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (Optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you creating this snapshot?"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (Optional)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="milestone, review, draft (comma-separated)"
              maxLength={200}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSnapshot}
              disabled={!label.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Snapshot"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VersionItem: React.FC<{
  version: Version;
  isActive: boolean;
  onRestore: (version: Version) => void;
  onCompare: (version: Version) => void;
}> = ({ version, isActive, onRestore, onCompare }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "creation":
        return "bg-green-100 text-green-800";
      case "content":
        return "bg-blue-100 text-blue-800";
      case "annotation":
        return "bg-purple-100 text-purple-800";
      case "snapshot":
        return "bg-orange-100 text-orange-800";
      case "restore":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card
      className={`transition-all ${isActive ? "ring-2 ring-blue-500" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              <span className="font-medium truncate">{version.label}</span>
              {isActive && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
              {version.isSnapshot && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Camera className="w-3 h-3" />
                  Snapshot
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {version.user?.username || version.user?.email || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(version.createdAt)}
              </span>
              <Badge
                className={`text-xs ${getChangeTypeColor(version.changeType)}`}
              >
                {version.changeType}
              </Badge>
            </div>

            {isExpanded && (
              <div className="space-y-3 mt-3 pl-6 border-l-2 border-gray-200">
                {version.changeSummary && (
                  <p className="text-sm text-gray-700">
                    {version.changeSummary}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-medium">Sequence:</span> #
                    {version.sequenceNumber}
                  </div>
                  <div>
                    <span className="font-medium">Changes:</span>{" "}
                    {version.changeCount}
                  </div>
                  {version.wordCount !== undefined && (
                    <div>
                      <span className="font-medium">Words:</span>{" "}
                      {version.wordCount.toLocaleString()}
                    </div>
                  )}
                  {version.characterCount !== undefined && (
                    <div>
                      <span className="font-medium">Characters:</span>{" "}
                      {version.characterCount.toLocaleString()}
                    </div>
                  )}
                </div>

                {version.tags && version.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="w-3 h-3" />
                    {version.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {!isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestore(version)}
                      className="gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCompare(version)}
                    className="gap-1"
                  >
                    <GitBranch className="w-3 h-3" />
                    Compare
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const VersionManager: React.FC<VersionManagerProps> = ({
  docId,
  onVersionRestore,
  onSnapshotCreated,
  currentVersionId,
  className = "",
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedVersionForDiff, setSelectedVersionForDiff] =
    useState<Version | null>(null);
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState<string | null>(
    null
  );

  // Fetch versions
  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchDocumentVersions(docId, {
        limit: 50,
        includeSnapshots: true,
      });
      setVersions(response.versions || []);
    } catch (err) {
      setError("Failed to load versions");
      console.error("Error fetching versions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      fetchVersions();
    }
  }, [docId]);

  // Handle version restore
  const handleRestoreVersion = async (version: Version) => {
    if (isRestoringVersion) return;

    try {
      setIsRestoringVersion(version.id);
      await restoreVersion(version.id, true);
      await fetchVersions(); // Refresh versions list
      onVersionRestore?.(version);
    } catch (err) {
      setError("Failed to restore version");
      console.error("Error restoring version:", err);
    } finally {
      setIsRestoringVersion(null);
    }
  };

  // Handle snapshot creation
  const handleSnapshotCreated = (snapshot: Version) => {
    setVersions((prev) => [snapshot, ...prev]);
    onSnapshotCreated?.(snapshot);
  };

  // Handle version comparison
  const handleCompareVersion = async (version: Version) => {
    if (!currentVersionId || version.id === currentVersionId) return;

    try {
      const diff = await getVersionDiff(version.id, currentVersionId);
      setVersionDiff(diff);
      setSelectedVersionForDiff(version);
      setActiveTab("diff");
    } catch (err) {
      setError("Failed to generate version diff");
      console.error("Error generating diff:", err);
    }
  };

  // Group versions by date for timeline view
  const groupedVersions = useMemo(() => {
    const groups: { [key: string]: Version[] } = {};
    versions.forEach((version) => {
      const date = formatDate(version.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(version);
    });
    return groups;
  }, [versions]);

  // Statistics
  const stats = useMemo(() => {
    const total = versions.length;
    const snapshots = versions.filter((v) => v.isSnapshot).length;
    const autoSaves = versions.filter((v) => v.isAutosave).length;
    const published = versions.filter((v) => v.isPublished).length;

    return { total, snapshots, autoSaves, published };
  }, [versions]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center p-8">
          <Activity className="w-6 h-6 animate-spin mr-2" />
          Loading versions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={fetchVersions} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with stats and actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Version History
            </CardTitle>
            <SnapshotDialog
              docId={docId}
              onSnapshotCreated={handleSnapshotCreated}
            />
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="font-medium">{stats.total}</span> total
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span className="font-medium">{stats.snapshots}</span> snapshots
            </span>
            <span className="flex items-center gap-1">
              <Save className="w-3 h-3" />
              <span className="font-medium">{stats.autoSaves}</span> auto-saves
            </span>
            {stats.published > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span className="font-medium">{stats.published}</span> published
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="diff" disabled={!versionDiff}>
                Compare
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="p-4">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupedVersions).map(
                    ([date, dayVersions]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm text-gray-700">
                            {date}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        <div className="space-y-2">
                          {dayVersions.map((version) => (
                            <VersionItem
                              key={version.id}
                              version={version}
                              isActive={version.id === currentVersionId}
                              onRestore={handleRestoreVersion}
                              onCompare={handleCompareVersion}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {versions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No versions found for this document.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="diff" className="p-4">
              {versionDiff && selectedVersionForDiff && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Comparing: {selectedVersionForDiff.label} vs Current
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVersionDiff(null);
                        setSelectedVersionForDiff(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {versionDiff.from.label} (#
                          {versionDiff.from.sequenceNumber})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <div>
                          Words:{" "}
                          {versionDiff.from.wordCount?.toLocaleString() ||
                            "N/A"}
                        </div>
                        <div>
                          Characters:{" "}
                          {versionDiff.from.characterCount?.toLocaleString() ||
                            "N/A"}
                        </div>
                        <div>
                          Date: {formatDate(versionDiff.from.createdAt)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {versionDiff.to.label} (#
                          {versionDiff.to.sequenceNumber})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <div>
                          Words:{" "}
                          {versionDiff.to.wordCount?.toLocaleString() || "N/A"}
                        </div>
                        <div>
                          Characters:{" "}
                          {versionDiff.to.characterCount?.toLocaleString() ||
                            "N/A"}
                        </div>
                        <div>Date: {formatDate(versionDiff.to.createdAt)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Changes Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-4 text-sm">
                        <span
                          className={`flex items-center gap-1 ${
                            versionDiff.changes.wordCountDiff >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Words:{" "}
                          {versionDiff.changes.wordCountDiff >= 0 ? "+" : ""}
                          {versionDiff.changes.wordCountDiff}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            versionDiff.changes.characterCountDiff >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Characters:{" "}
                          {versionDiff.changes.characterCountDiff >= 0
                            ? "+"
                            : ""}
                          {versionDiff.changes.characterCountDiff}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Restore confirmation indicator */}
      {isRestoringVersion && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin" />
          Restoring version...
        </div>
      )}
    </div>
  );
};

export default VersionManager;
