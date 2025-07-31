import { getHeaders, getHeadersMultipart } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

export const fetchPublicDocuments = async () => {
  try {
    const response = await fetch(`${server_url}/documents/public`, {
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
};

export const fetchDocuments = async ({
  search,
  isRoot,
}: { search?: string; isRoot?: boolean } = {}) => {
  try {
    let url = `${server_url}/documents`;
    const params = new URLSearchParams();

    if (search) params.append("search", search);
    if (isRoot !== undefined) params.append("isRoot", isRoot.toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
};

export const fetchDocument = async (id: string) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("Failed to fetch document");
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const fetchPublicDocument = async (id: string) => {
  try {
    const response = await fetch(`${server_url}/documents/public/${id}`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("Failed to fetch public document");
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const fetchDocumentWithContent = async (id: string) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}/content`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("Failed to fetch document");
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const createDocument = async (formData: FormData) => {
  const response = await fetch(`${server_url}/documents`, {
    method: "POST",
    headers: {
      ...getHeadersMultipart(),
      // Don't set Content-Type header, it will be automatically set with the boundary
    },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error ?? "Failed to create document");
  }

  return response.json();
};

export const createDocumentWithContent = async (formData: FormData) => {
  const body = JSON.stringify(Object.fromEntries(formData));
  console.log("sending", body);
  const response = await fetch(`${server_url}/documents/content`, {
    method: "POST",
    headers: getHeaders(),
    body,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error ?? "Failed to create document");
  }

  return response.json();
};

export const updatePermission = async (
  id: string,
  email: string,
  canRead: string,
  canWrite: string
) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}/permissions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        email,
        canRead,
        canWrite,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to update permission" };
  }
};
export const deleteDocument = async (id: string) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}`, {
      headers: getHeaders(),
      method: "DELETE",
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
};

interface UpdateDocumentParams {
  name?: string;
}

interface AnnotationRange {
  from: number;
  to: number;
  type: string;
}

interface UpdateContentDocumentParams {
  content?: string; // Plain text content (clean, no annotation markers)
  annotations?: AnnotationRange[]; // Separate annotations array
  createSnapshot?: boolean;
  workflowId?: string;
  changeSummary?: string;
  sessionId?: string;
}

/**
 * Fetch all translations for a document
 * @param documentId The ID of the document to fetch translations for
 * @returns A promise that resolves to an array of translations
 */
export const fetchDocumentTranslations = async (documentId: string) => {
  try {
    const response = await fetch(
      `${server_url}/documents/${documentId}/translations`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );
    console.log("response", response);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message ?? "Failed to fetch translations");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching translations:", error);
    throw error;
  }
};

/**
 * Fetch all translations for a public document
 * @param documentId The ID of the document to fetch translations for
 * @returns A promise that resolves to an array of translations
 */
export const fetchPublicDocumentTranslations = async (documentId: string) => {
  try {
    const response = await fetch(
      `${server_url}/documents/${documentId}/translations`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      // If unauthorized, return empty array instead of throwing error
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      throw new Error("Failed to fetch translations");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching public translations:", error);
    return []; // Return empty array for public access
  }
};

export const updateDocument = async (
  id: string,
  data: UpdateDocumentParams
) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to update document");
    }

    const updatedData = await response.json();
    return updatedData.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to update document");
  }
};

export interface GenerateTranslationParams {
  rootId: string;
  language: string;
  model: string;
  use_segmentation: string | null;
}

export const generateTranslation = async (
  params: GenerateTranslationParams
) => {
  try {
    const response = await fetch(
      `${server_url}/documents/generate-translation`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to generate translation");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to generate translation");
  }
};

export const updateContentDocument = async (
  id: string,
  data: UpdateContentDocumentParams
) => {
  try {
    const response = await fetch(`${server_url}/documents/${id}/content`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to update document");
    }
    const updatedData = await response.json();
    return updatedData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to update document");
  }
};

/**
 * Create a manual snapshot of the current document state
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
) => {
  try {
    const response = await fetch(`${server_url}/documents/${docId}/snapshot`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ label, reason, tags }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to create snapshot");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to create snapshot");
  }
};

/**
 * Start a new editing workflow session
 * @param docId - Document ID
 * @param workflowType - Type of workflow
 * @param sessionId - Optional session ID
 */
export const startDocumentWorkflow = async (
  docId: string,
  workflowType: string = "editing",
  sessionId?: string
) => {
  try {
    const response = await fetch(
      `${server_url}/documents/${docId}/workflow/start`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ workflowType, sessionId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to start workflow");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to start workflow");
  }
};

/**
 * Complete an editing workflow session
 * @param docId - Document ID
 * @param workflowId - Workflow ID
 */
export const completeDocumentWorkflow = async (
  docId: string,
  workflowId: string
) => {
  try {
    const response = await fetch(
      `${server_url}/documents/${docId}/workflow/${workflowId}/complete`,
      {
        method: "POST",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to complete workflow");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to complete workflow");
  }
};

/**
 * Fetches only the translation status and progress for translations of a root document
 * More efficient than fetching the entire document when polling for status updates
 */
export const fetchTranslationStatus = async (rootId: string) => {
  try {
    const response = await fetch(
      `${server_url}/documents/${rootId}/translations/status`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to fetch translation status");
    }
    const respond = await response.json();
    return respond;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to fetch translation status");
  }
};

export const fetchTranslationStatusByJobId = async (jobId: string) => {
  try {
    const response = await fetch(
      `${server_url}/documents/translation-status/${jobId}`,
      {
        headers: getHeaders(),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to fetch translation status");
    }
    const respond = await response.json();
    return respond;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to fetch translation status");
  }
};

/**
 * Fetches status for a single translation by its document ID
 * More efficient than fetching all translations when only one needs updating
 */
export const fetchSingleTranslationStatus = async (translationId: string) => {
  try {
    const response = await fetch(
      `${server_url}/documents/translation/${translationId}/status`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error ?? "Failed to fetch translation status");
    }
    const respond = await response.json();
    return respond;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to fetch translation status");
  }
};

export const fixEmptyContent = async () => {
  try {
    const response = await fetch(`${server_url}/documents/fix-empty-content`, {
      method: "POST",
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("Failed to fix empty content");
  } catch (error) {
    console.error("Error fixing empty content:", error);
    throw error;
  }
};
