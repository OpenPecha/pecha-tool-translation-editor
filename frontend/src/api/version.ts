import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

/**
 * Fetch all versions for a given document
 * @param docId - ID of the document
 */
export const fetchVersions = async (docId: string) => {
  if (!docId) return ;
  

  try {
    const response = await fetch(`${server_url}/versions/${docId}`, {
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
 * Fetch a specific version by its ID
 * @param versionId - ID of the version
 */
export const fetchVersion = async (versionId: string) => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}`,
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
 * Create a new version for a document
 * @param docId - Document ID
 * @param label - Name for the version (e.g., "Auto-save", "Manual Save")
 * @param content - Quill delta JSON content
 */
export const createVersion = async (
  docId: string,
  label: string,
  content: any
) => {
  try {
    const response = await fetch(`${server_url}/versions`, {
      method: "POST",
      headers: {
        ...getHeaders(),
      },
      body: JSON.stringify({ docId, label, content }),
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
 * Update a version's label
 * @param versionId - Version ID
 * @param label - New label for the version
 */
export const updateVersion = async (versionId: string, label: string) => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}`,
      {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label }),
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
 * Delete a version by its ID
 * @param versionId - ID of the version
 */
export const deleteVersion = async (versionId: string) => {
  try {
    const response = await fetch(
      `${server_url}/versions/version/${versionId}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete version");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting version:", error);
    throw error;
  }
};

export const getVersionDiff = async (versionId: string) => {
  try {
    const response = await fetch(
      `${server_url}/texts/version-diff/${versionId}`,
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
