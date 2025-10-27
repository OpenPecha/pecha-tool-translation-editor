import { getHeaders } from "./utils";
export const server_url = import.meta.env.VITE_SERVER_URL;

export interface Permission {
  userId: string;
  canRead: boolean;
  canWrite: boolean;
  user?: {
    id: string;
    username: string;
  };
}

export interface Project {
  id: string;
  name: string;
  identifier: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  metadata?: Record<string, unknown>;
  roots?: {
    id: string;
    identifier: string;
    name: string;
    updatedAt: string;
  }[];
  permissions?: Permission[];
  translations?: {
    id: string;
    identifier: string;
    language?: string;
  }[];
  owner?: {
    id: string;
    username: string;
  };
}

export interface CreateProjectParams {
  name: string;
  identifier: string;
  rootId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectParams {
  name?: string;
  identifier?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

// Fetch all projects for the current user
export const fetchProjects = async ({
  status = "active",
  searchQuery = "",
  page = 1,
  limit = 10,
  isPublic = undefined,
}: {
  status?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
  isPublic?: boolean;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (status) {
      queryParams.append("status", status);
    }
    if (searchQuery) {
      queryParams.append("search", searchQuery);
    }
    if (page) {
      queryParams.append("page", page.toString());
    }
    if (limit) {
      queryParams.append("limit", limit.toString());
    }
    if (isPublic) {
      queryParams.append("public", isPublic.toString());
    }

    const url = `${server_url}/projects?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

// Fetch a single project by ID
export const fetchProjectById = async (projectId: string) => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    throw error;
  }
};

// Create a new project
export const createProject = async (projectData: CreateProjectParams) => {
  try {
    const response = await fetch(`${server_url}/projects`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

// Update an existing project
export const updateProject = async (
  projectId: string,
  updateData: UpdateProjectParams
) => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}`, {
      method: "PUT",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
};

// Delete a project (soft delete by changing status)
export const deleteProject = async (projectId: string) => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
};

// Add a document to a project
export const addDocumentToProject = async (
  projectId: string,
  docId: string,
  isRoot: boolean = false
) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/documents`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ docId, isRoot }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to add document to project: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error adding document to project ${projectId}:`, error);
    throw error;
  }
};

// Remove a document from a project
export const removeDocumentFromProject = async (
  projectId: string,
  docId: string
) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/documents/${docId}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to remove document from project: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error removing document from project ${projectId}:`, error);
    throw error;
  }
};

// Add a user to a project (create permission)
export const addUserToProject = async (
  projectId: string,
  userId: string,
  canWrite: boolean = false
) => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}/users`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, canWrite }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add user to project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error adding user to project ${projectId}:`, error);
    throw error;
  }
};

// Remove a user from a project (delete permission)
export const removeUserFromProject = async (
  projectId: string,
  userId: string
) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/users/${userId}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to remove user from project: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error removing user from project ${projectId}:`, error);
    throw error;
  }
};

// Update a user's permissions in a project
export const updateUserProjectPermission = async (
  projectId: string,
  userId: string,
  canWrite: boolean
) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canWrite }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update user permission: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Error updating user permission in project ${projectId}:`,
      error
    );
    throw error;
  }
};

// Add a user to a project by email
export const addUserToProjectByEmail = async (
  projectId: string,
  email: string,
  canWrite: boolean = false
) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/users/email`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, canWrite }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add user to project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error adding user to project ${projectId}:`, error);
    throw error;
  }
};

// Get project permissions
export const fetchProjectPermissions = async (projectId: string) => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/permissions`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch project permissions: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching project permissions ${projectId}:`, error);
    throw error;
  }
};

// Search for a user by email
export const searchUserByEmail = async (email: string) => {
  try {
    const response = await fetch(
      `${server_url}/users/search?query=${encodeURIComponent(email)}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search user: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching user:", error);
    throw error;
  }
};

// Download all documents in a project as a zip file
export const downloadProjectDocuments = async (
  projectId: string,
  exportFormat: string,
  documentId?: string,
  progressId?: string,
  translationId?: string
) => {
  try {
    const queryParams = new URLSearchParams({ type: exportFormat });
    if (documentId) {
      queryParams.append("documentId", documentId);
    }
    if (progressId) {
      queryParams.append("progressId", progressId);
    }
    if (translationId) {
      queryParams.append("translationId", translationId);
    }

    const response = await fetch(
      `${server_url}/projects/${projectId}/export?${queryParams.toString()}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to download project documents: ${response.statusText}`
      );
    }

    // Return the blob for direct download
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error(`Error downloading project documents ${projectId}:`, error);
    throw error;
  }
};

// =============================================================================
// GOOGLE DOCS-STYLE SHARING API FUNCTIONS
// =============================================================================

export interface ShareSettings {
  isPublic: boolean;
  publicAccess: "none" | "viewer" | "editor";
}

export interface CollaboratorData {
  email: string;
  accessLevel: "viewer" | "editor" | "admin";
  message?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  picture?: string;
}

export interface Collaborator {
  id: string;
  userId: string;
  accessLevel: "viewer" | "editor" | "admin";
  canRead: boolean;
  canWrite: boolean;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectShareInfo {
  id: string;
  name: string;
  isPublic: boolean;
  publicAccess: "none" | "viewer" | "editor";
  shareableLink: string | null;
  isOwner: boolean;
  permissions: Collaborator[];
  owner: User;
  rootDocument?: {
    id: string;
    name: string;
  };
}

// Get project sharing information
export const getProjectShareInfo = async (
  projectId: string
): Promise<{ success: boolean; data: ProjectShareInfo }> => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}/share`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get project sharing info: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting project sharing info:", error);
    throw error;
  }
};

// Update project sharing settings
export const updateProjectShareSettings = async (
  projectId: string,
  settings: ShareSettings
): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await fetch(`${server_url}/projects/${projectId}/share`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update sharing settings: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating sharing settings:", error);
    throw error;
  }
};

// Add collaborator to project
export const addCollaborator = async (
  projectId: string,
  collaboratorData: CollaboratorData
): Promise<{ success: boolean; data: Collaborator; message: string }> => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/collaborators`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(collaboratorData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to add collaborator: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding collaborator:", error);
    throw error;
  }
};

// Update collaborator access level
export const updateCollaboratorAccess = async (
  projectId: string,
  userId: string,
  accessLevel: "viewer" | "editor" | "admin"
): Promise<{ success: boolean; data: Collaborator }> => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/collaborators/${userId}`,
      {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessLevel }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update collaborator access: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating collaborator access:", error);
    throw error;
  }
};

// Remove collaborator from project
export const removeCollaborator = async (
  projectId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(
      `${server_url}/projects/${projectId}/collaborators/${userId}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to remove collaborator: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error removing collaborator:", error);
    throw error;
  }
};

// Search users for collaboration
export const searchUsers = async (
  query: string
): Promise<{ success: boolean; data: User[] }> => {
  try {
    const response = await fetch(
      `${server_url}/users/search?query=${encodeURIComponent(query)}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};
