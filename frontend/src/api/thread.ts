import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

export interface Thread {
	id: string;
	documentId: string;
	isSystemGenerated: boolean;
	initialStartOffset: number;
	initialEndOffset: number;
	selectedText: string | null;
	createdByUserId: string;
	createdAt: string;
	updatedAt: string;
	createdByUser?: {
		id: string;
		username: string;
		email: string;
		picture?: string;
	};
	comments?: any[];
}

export const fetchThreads = async (
  documentId: string,
  startOffset?: number,
  endOffset?: number
) => {
  try {
    let url = `${server_url}/threads?documentId=${documentId}`;
    if (startOffset !== undefined && endOffset !== undefined) {
      url += `&startOffset=${startOffset}&endOffset=${endOffset}`;
    }
    const response = await fetch(url, {
      headers: getHeaders()
    });
    if (!response.ok) {
      throw new Error("Failed to fetch threads");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching threads:", error);
    throw error;
  }
};

export const createThread = async (
  documentId: string,
  initialStartOffset: number,
  initialEndOffset: number,
  selectedText: string
) => {
  try {
    const response = await fetch(`${server_url}/threads`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        documentId,
        initialStartOffset,
        initialEndOffset,
        selectedText,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create thread");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

/**
 * Fetch a specific thread by ID
 * @param {string} threadId - The thread ID
 * @returns {Promise<Thread>} - The thread data
 */
export const fetchThread = async (threadId: string): Promise<Thread | null> => {
	try {
		const response = await fetch(`${server_url}/threads/${threadId}`, {
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to fetch thread");

		return await response.json();
	} catch (error) {
		console.error("Error fetching thread:", error);
		return null;
	}
};

/**
 * Update a thread
 * @param {string} threadId - The thread ID
 * @param {string} [selectedText] - Updated selected text
 * @returns {Promise<Thread>} - The updated thread
 */
export const updateThread = async (
	threadId: string,
	selectedText?: string,
): Promise<Thread | null> => {
	try {
		const response = await fetch(`${server_url}/threads/${threadId}`, {
			method: "PUT",
			headers: getHeaders(),
			body: JSON.stringify({
				selectedText,
			}),
		});

		if (!response.ok) throw new Error("Failed to update thread");

		return await response.json();
	} catch (error) {
		console.error("Error updating thread:", error);
		return null;
	}
};

/**
 * Delete a thread
 * @param {string} threadId - The thread ID
 * @returns {Promise<void>}
 */
export const deleteThread = async (threadId: string): Promise<void> => {
	try {
		const response = await fetch(`${server_url}/threads/${threadId}`, {
			method: "DELETE",
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to delete thread");
	} catch (error) {
		console.error("Error deleting thread:", error);
		throw error;
	}
};

