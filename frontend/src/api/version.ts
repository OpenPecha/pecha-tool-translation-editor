import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

export interface Version {
  id: string;
  docId: string;
  label: string;
  sequenceNumber: number;
  changeType: string;
  changeSummary?: string;
  changeCount: number;
  wordCount?: number;
  characterCount?: number;
  contentDiff?: Record<string, unknown>;
  isAutosave: boolean;
  isPublished: boolean;
  isSnapshot: boolean;
  snapshotReason?: string;
  tags: string[];
  branchName?: string;
  isMerge: boolean;
  contentHash?: string;
  content: Record<string, unknown>;
  createdAt: string;
  publishedAt?: string;
  lastAccessedAt?: string;
  parentVersionId?: string;
  user?: {
    id: string;
    username?: string;
    email: string;
    picture?: string;
  };
  parentVersion?: {
    id: string;
    label: string;
    sequenceNumber: number;
    createdAt: string;
  };
  children?: {
    id: string;
    label: string;
    sequenceNumber: number;
    createdAt: string;
  }[];
  annotations?: Record<string, unknown>[];
  _count?: {
    children: number;
    annotations: number;
  };
}

export interface VersionWorkflow {
  id: string;
  docId: string;
  userId: string;
  sessionId: string;
  status: string;
  workflowType: string;
  startVersionId?: string;
  endVersionId?: string;
  totalChanges: number;
  contentChanges: number;
  annotationChanges: number;
  autoSaveCount: number;
  checkpointCount: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  user?: {
    id: string;
    username?: string;
    email: string;
    picture?: string;
  };
}

export interface VersionDiff {
  from: {
    id: string;
    label: string;
    sequenceNumber: number;
    wordCount?: number;
    characterCount?: number;
    createdAt: string;
  };
  to: {
    id: string;
    label: string;
    sequenceNumber: number;
    wordCount?: number;
    characterCount?: number;
    createdAt: string;
  };
  changes: {
    wordCountDiff: number;
    characterCountDiff: number;
    contentDiff: Record<string, unknown>;
  };
}

/**
 * Fetch all versions for a given document with enhanced options
 * @param docId - ID of the document
 * @param options - Fetch options
 */
export const fetchVersions = async (
  docId: string,
  options: {
    limit?: number;
    offset?: number;
    includeSnapshots?: boolean;
    branchName?: string;
  } = {}
) => {
  if (!docId) return null;

  const {
    limit = 50,
    offset = 0,
    includeSnapshots = true,
    branchName,
  } = options;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    includeSnapshots: includeSnapshots.toString(),
    ...(branchName && { branchName }),
  });

  try {
    const response = await fetch(`${server_url}/versions/${docId}?${params}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch versions");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching versions:", error);
    throw error;
  }
};

/**
 * Fetch a specific version by its ID with full details
 * @param versionId - ID of the version
 * @param includeAnnotations - Whether to include annotations
 */
export const fetchVersion = async (
  versionId: string,
  includeAnnotations: boolean = true
): Promise<Version> => {
  try {
    const params = new URLSearchParams({
      includeAnnotations: includeAnnotations.toString(),
    });

    const response = await fetch(
      `${server_url}/versions/version/${versionId}?${params}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching version:", error);
    throw error;
  }
};

/**
 * Create a new version for a document with enhanced options
 * @param params - Version creation parameters
 */
export const createVersion = async (params: {
  docId: string;
  label?: string;
  content: Record<string, unknown>;
  changeType?: string;
  changeSummary?: string;
  isSnapshot?: boolean;
  snapshotReason?: string;
  tags?: string[];
  branchName?: string;
  parentVersionId?: string;
}): Promise<Version> => {
  try {
    const response = await fetch(`${server_url}/versions`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to create version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating version:", error);
    throw error;
  }
};

/**
 * Update a version's metadata
 * @param versionId - Version ID
 * @param updates - Fields to update
 */
export const updateVersion = async (
  versionId: string,
  updates: {
    label?: string;
    changeSummary?: string;
    tags?: string[];
    isSnapshot?: boolean;
    snapshotReason?: string;
    isPublished?: boolean;
  }
): Promise<Version> => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}`,
      {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating version:", error);
    throw error;
  }
};

/**
 * Delete a version by its ID with safety options
 * @param versionId - ID of the version
 * @param force - Whether to force delete (bypass safety checks)
 */
export const deleteVersion = async (
  versionId: string,
  force: boolean = false
) => {
  try {
    const params = force ? "?force=true" : "";
    const response = await fetch(
      `${server_url}/versions/version/${versionId}${params}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting version:", error);
    throw error;
  }
};

/**
 * Restore document to a specific version
 * @param versionId - ID of the version to restore to
 * @param createSnapshot - Whether to create a snapshot before restoring
 */
export const restoreVersion = async (
  versionId: string,
  createSnapshot: boolean = true
) => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}/restore`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ createSnapshot }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to restore version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error restoring version:", error);
    throw error;
  }
};

/**
 * Get diff between two versions
 * @param versionId1 - First version ID
 * @param versionId2 - Second version ID
 */
export const getVersionDiff = async (
  versionId1: string,
  versionId2: string
): Promise<VersionDiff> => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId1}/diff/${versionId2}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get version diff");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting version diff:", error);
    throw error;
  }
};

/**
 * Create a snapshot from an existing version
 * @param versionId - Source version ID
 * @param label - Snapshot label
 * @param reason - Reason for creating snapshot
 * @param tags - Tags for the snapshot
 */
export const createVersionSnapshot = async (
  versionId: string,
  label?: string,
  reason?: string,
  tags: string[] = []
): Promise<Version> => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}/snapshot`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label, reason, tags }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create snapshot");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating snapshot:", error);
    throw error;
  }
};

/**
 * Get version timeline for a document
 * @param docId - Document ID
 * @param options - Timeline options
 */
export const getVersionTimeline = async (
  docId: string,
  options: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
  } = {}
) => {
  const { startDate, endDate, branchName } = options;

  const params = new URLSearchParams({
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(branchName && { branchName }),
  });

  try {
    const response = await fetch(
      `${server_url}/versions/${docId}/timeline?${params}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch version timeline");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching version timeline:", error);
    throw error;
  }
};

// Document version management APIs

/**
 * Fetch version history for a document (using document endpoint)
 * @param docId - Document ID
 * @param options - Fetch options
 */
export const fetchDocumentVersions = async (
  docId: string,
  options: {
    limit?: number;
    offset?: number;
    includeSnapshots?: boolean;
  } = {}
) => {
  const { limit = 20, offset = 0, includeSnapshots = true } = options;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    includeSnapshots: includeSnapshots.toString(),
  });

  try {
    const response = await fetch(
      `${server_url}/documents/${docId}/versions?${params}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch document versions");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching document versions:", error);
    throw error;
  }
};

/**
 * Create a manual snapshot of current document state
 * @param docId - Document ID
 * @param label - Snapshot label
 * @param reason - Reason for creating snapshot
 * @param tags - Tags for the snapshot
 */
export const createDocumentSnapshot = async (
  docId: string,
  label?: string,
  reason?: string,
  tags: string[] = []
): Promise<Version> => {
  try {
    const response = await fetch(`${server_url}/documents/${docId}/snapshot`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label, reason, tags }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create document snapshot");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating document snapshot:", error);
    throw error;
  }
};

// Workflow management APIs

/**
 * Start a new editing workflow session
 * @param docId - Document ID
 * @param workflowType - Type of workflow
 * @param sessionId - Optional session ID
 */
export const startWorkflow = async (
  docId: string,
  workflowType: string = "editing",
  sessionId?: string
): Promise<VersionWorkflow> => {
  try {
    const response = await fetch(
      `${server_url}/documents/${docId}/workflow/start`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflowType, sessionId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to start workflow");
    }

    return await response.json();
  } catch (error) {
    console.error("Error starting workflow:", error);
    throw error;
  }
};

/**
 * Complete an editing workflow session
 * @param docId - Document ID
 * @param workflowId - Workflow ID
 */
export const completeWorkflow = async (
  docId: string,
  workflowId: string
): Promise<VersionWorkflow> => {
  try {
    const response = await fetch(
      `${server_url}/documents/${docId}/workflow/${workflowId}/complete`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to complete workflow");
    }

    return await response.json();
  } catch (error) {
    console.error("Error completing workflow:", error);
    throw error;
  }
};

/**
 * Get workflow history for a document
 * @param docId - Document ID
 */
export const fetchWorkflows = async (docId: string) => {
  try {
    const response = await fetch(`${server_url}/documents/${docId}/workflows`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch workflows");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching workflows:", error);
    throw error;
  }
};
