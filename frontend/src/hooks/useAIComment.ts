import { useState } from "react";
import { useAuth } from "@/auth/use-auth-hook";
import { createComment } from "../api/comment";
import { useCommentStore } from "../stores/commentStore";
import { Thread, Comment } from "../stores/commentStore";
import { useQueryClient } from "@tanstack/react-query";

export const useAIComment = (documentId: string) => {
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamStatus, setStreamStatus] = useState<'thinking' | 'streaming' | 'completed' | 'saved' | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { currentUser } = useAuth();
	const { addCommentToThread, updateCommentContent, removeComment, replaceComment } =
		useCommentStore();
	const queryClient = useQueryClient();

	const generateAIComment = async (
		content: string,
		threadId: string,
		activeThread: Thread | null,
	) => {
		if (!currentUser) {
			setError("You must be logged in to comment.");
			return;
		}

	// Step 1: Optimistically add the user's comment
	const userTempId = `temp-user-${Date.now()}`;
	const userTempComment: Comment = {
		id: userTempId,
		content,
		user: {
			id: currentUser.id,
			username: currentUser.name || currentUser.email,
			email: currentUser.email,
			picture: currentUser.picture,
		},
		userId: currentUser.id,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		isSystemGenerated: false,
		threadId,
	};
	addCommentToThread(threadId, userTempComment);


	// Step 2: Optimistically add the AI placeholder and start the stream
	setIsStreaming(true);
	setStreamStatus('thinking');
	setError(null);

	const aiTempId = `temp-ai-${Date.now()}`;
	const aiTempComment: Comment = {
		id: aiTempId,
		content: "",
		user: {
			id: "ai-assistant",
			username: "AI Assistant",
			email: "ai@assistant.com",
			picture: undefined,
		},
		userId: currentUser.id, // Or a dedicated AI user ID
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		isSystemGenerated: true,
		threadId: threadId
	};

	addCommentToThread(threadId, aiTempComment);

	let fullContent = "";
	let hasReceivedFirstDelta = false;

	try {
		// This single call will save the user's comment AND trigger the AI stream
		await createComment(documentId, currentUser.id, content, threadId, {
			selectedText: activeThread?.selectedText || undefined,
			onDelta: (delta) => {
				// First delta received - switch from thinking to streaming
				if (!hasReceivedFirstDelta) {
					setStreamStatus('streaming');
					hasReceivedFirstDelta = true;
				}
				fullContent += delta;
				updateCommentContent(threadId, aiTempId, fullContent);
			},
			onCompletion: (finalText) => {
				// AI finished generating the response
				setStreamStatus('completed');
				updateCommentContent(threadId, aiTempId, finalText);
			},
			onSave: (finalComment) => {
				// Comment saved to database, replace with real record
				if (finalComment) {
					setStreamStatus('saved');
					replaceComment(threadId, aiTempId, finalComment);
				}
				setIsStreaming(false);
				setStreamStatus(null);
				// Invalidate to get the real user comment and AI comment from server
				queryClient.invalidateQueries({ queryKey: ["threads", documentId] });
			},
			onError: (errorMessage) => {
				console.error("AI Error:", errorMessage);
				// Remove both optimistic comments on error
				removeComment(threadId, userTempId);
				removeComment(threadId, aiTempId);
				setError(errorMessage);
				setIsStreaming(false);
				setStreamStatus(null);
			},
		});
	} catch (e) {
		console.error("Failed to generate AI comment:", e);
		// Remove both optimistic comments on error
		removeComment(threadId, userTempId);
		removeComment(threadId, aiTempId);
		setError("Failed to generate AI comment.");
		setIsStreaming(false);
		setStreamStatus(null);
	}
	};

	return { isStreaming, streamStatus, error, generateAIComment };
};
