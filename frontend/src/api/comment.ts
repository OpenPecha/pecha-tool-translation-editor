import { getHeaders } from "./utils";
import { AddCommentProps } from "@/components/Comment/hooks/types";
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
 * Create a new comment. This function handles both regular and AI comments.
 * If the comment is an AI comment, it will handle the streaming response.
 *
 * @param {string} docId - The document ID
 * @param {string} userId - The user ID
 * @param {string} content - The comment text
 * @param {string | null} threadId - The thread ID this comment belongs to
 * @param {object} options - Optional parameters for the comment.
 * @returns {Promise<any>} - The created comment (for regular comments) or void (for AI comments).
 */
export const addComment = async (comment: AddCommentProps) => {
	try {
		const response = await fetch(`${server_url}/comments`, {
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify({
				docId: comment.docId,
				content: comment.content,
				threadId: comment.threadId,
				isSuggestion: comment.options.isSuggestion || false,
				suggestedText: comment.options.suggestedText || null,
				isSystemGenerated: comment.options.isSystemGenerated || false,
				selectedText: comment.options.selectedText || null,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create comment: ${response.statusText}`);
		}

		// Check if the response is a stream for an AI comment
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("text/event-stream")) {
			if (comment.options.onDelta && comment.options.onSave && comment.options.onError) {
				await handleStreamedResponse(response, comment.options.onDelta, comment.options.onCompletion, comment.options.onSave, comment.options.onError);
			}
			return; // Streaming is handled, no JSON to return
		}
		return await response.json();
	} catch (error) {
		console.error("Error creating comment:", error);
		if (comment.options.onError) {
			comment.options.onError(error instanceof Error ? error.message : "An unknown error occurred");
		}
		throw error;
	}
};

const handleStreamedResponse = async (
	response: Response,
	onDelta: (delta: string) => void,
	onCompletion: ((finalText: string) => void) | undefined,
	onSave: (comment: any) => void,
	onError: (message: string) => void,
) => {
	if (!response.body) {
		return onError("Response body is null");
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

		for (const line of lines) {
			if (line.startsWith("data:")) {
				const jsonStartIndex = line.indexOf("{");
				if (jsonStartIndex !== -1) {
					const jsonString = line.substring(jsonStartIndex);
					try {
						const parsed = JSON.parse(jsonString);
						
						if (parsed.type === "comment_delta") {
							onDelta(parsed.text || "");
						} else if (parsed.type === "completion") {
							if (onCompletion && parsed.text) {
								onCompletion(parsed.text);
							}
						} else if (parsed.type === "saved_comment") {
							if (parsed.comment) {
								onSave(parsed.comment);
							}
						} else if (parsed.type === "error") {
							console.error("❌ Error:", parsed.message);
							onError(parsed.message || "An unknown error occurred");
						} else {
							console.warn("⚠️ Unknown event type:", parsed.type);
						}
					} catch (e) {
						console.error("Failed to parse stream data:", e, "Raw data:", jsonString);
					}
				}
			}
		}
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
