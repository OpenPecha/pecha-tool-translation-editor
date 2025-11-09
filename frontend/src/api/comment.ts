import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

/**
 * Fetch all comments for a specific document
 * @param {string} docId - The document ID
 * @returns {Promise<any>} - The list of comments
 */
export const fetchComments = async (docId: string) => {
	try {
		const response = await fetch(`${server_url}/comments/${docId}`, {
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to fetch comments");

		return await response.json();
	} catch (error) {
		console.error("Error fetching comments:", error);
	}
};

/**
 * Fetch a specific comment by ID
 * @param {string} commentId - The comment ID
 * @returns {Promise<any>} - The comment data
 */
export const fetchComment = async (commentId: string) => {
	try {
		const response = await fetch(`${server_url}/comments/${commentId}`, {
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to fetch comment");

		return await response.json();
	} catch (error) {
		console.error("Error fetching comment:", error);
	}
};

export const fetchCommentsByThreadId = async (threadId: string) => {
	try {
		const response = await fetch(`${server_url}/comments/thread/${threadId}`, {
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to fetch comments");

		return await response.json();
	} catch (error) {
		console.error("Error fetching comments:", error);
	}
};

/**
 * Create a new comment
 * @param {string} docId - The document ID
 * @param {string} userId - The user ID
 * @param {string} content - The comment text
 * @param {string} threadId - The thread ID this comment belongs to
 * @param {boolean} [isSuggestion] - Whether this is a suggestion
 * @param {string} [suggestedText] - The suggested text (required if isSuggestion is true)
 * @param {boolean} [isSystemGenerated] - Whether this comment was system-generated
 * @returns {Promise<any>} - The created comment
 */
export const createComment = async (
	docId: string,
	userId: string,
	content: string,
	threadId: string,
	isSuggestion?: boolean,
	suggestedText?: string,
	isSystemGenerated?: boolean,
) => {
	try {
		const response = await fetch(`${server_url}/comments`, {
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify({
				docId,
				userId,
				content,
				threadId,
				isSuggestion: isSuggestion || false,
				suggestedText: suggestedText || null,
				isSystemGenerated: isSystemGenerated || false,
			}),
		});

		if (!response.ok) throw new Error("Failed to create comment");

		return await response.json();
	} catch (error) {
		console.error("Error creating comment:", error);
		throw error;
	}
};

/**
 * Update an existing comment
 * @param {string} commentId - The comment ID
 * @param {string} content - The updated content
 * @param {boolean} [isSuggestion] - Whether this is a suggestion
 * @param {string} [suggestedText] - The suggested text
 * @returns {Promise<any>} - The updated comment
 */
export const updateComment = async (
	commentId: string,
	content: string,
	isSuggestion?: boolean,
	suggestedText?: string,
) => {
	try {
		const response = await fetch(`${server_url}/comments/${commentId}`, {
			method: "PUT",
			headers: getHeaders(),
			body: JSON.stringify({
				content,
				isSuggestion,
				suggestedText,
			}),
		});

		if (!response.ok) throw new Error("Failed to update comment");

		return await response.json();
	} catch (error) {
		console.error("Error updating comment:", error);
		throw error;
	}
};

/**
 * Delete a comment
 * @param {string} commentId - The comment ID
 * @returns {Promise<void>}
 */
export const deleteComment = async (commentId: string) => {
	try {
		const response = await fetch(`${server_url}/comments/${commentId}`, {
			method: "DELETE",
			headers: getHeaders(),
		});

		if (!response.ok) throw new Error("Failed to delete comment");
	} catch (error) {
		console.error("Error deleting comment:", error);
	}
};

/**
 * Fetch all comments for a public document
 * @param docId The ID of the document to fetch comments for
 * @returns A promise that resolves to an array of comments
 */
export const fetchPublicComments = async (docId: string) => {
	try {
		const response = await fetch(`${server_url}/comments/${docId}`, {
			method: "GET",
			headers: getHeaders(),
		});

		if (!response.ok) {
			// If unauthorized, return empty array instead of throwing error
			if (response.status === 401 || response.status === 403) {
				return [];
			}
			throw new Error("Failed to fetch comments");
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching public comments:", error);
		return []; // Return empty array for public access
	}
};
