import { useState } from "react";
import { useAuth } from "@/auth/use-auth-hook";
import { createComment } from "../api/comment";
import { Thread, Comment } from "../stores/commentStore";
import { useQueryClient } from "@tanstack/react-query";

export const useAIComment = (documentId: string) => {
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamStatus, setStreamStatus] = useState<'thinking' | 'streaming' | 'completed' | 'saved' | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { currentUser } = useAuth();
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

		const queryKey = ["threads", documentId];

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
		
		// Get previous threads for potential rollback
		const previousThreads = queryClient.getQueryData<Thread[]>(queryKey);
		// Optimistically add user comment to the cache
		queryClient.setQueryData<Thread[]>(queryKey, (oldThreads = []) =>
			oldThreads.map((thread) =>{
				return thread.id === threadId
					? { ...thread, comments: [...(thread.comments || []), userTempComment] }
					: thread
				}
			)
		);


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
			references: [],
			userId: currentUser.id, // Or a dedicated AI user ID
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			isSystemGenerated: true,
			threadId: threadId
		};
		
		// Optimistically add AI placeholder to the cache
		queryClient.setQueryData<Thread[]>(queryKey, (oldThreads = []) =>
			oldThreads.map((thread) =>
				thread.id === threadId
					? { ...thread, comments: [...(thread.comments || []), aiTempComment] }
					: thread
			)
		);

		let fullContent = "";
		let hasReceivedFirstDelta = false;

		const rollback = () => {
			if (previousThreads) {
				queryClient.setQueryData(queryKey, previousThreads);
			}
		};

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
					queryClient.setQueryData<Thread[]>(queryKey, (oldThreads = []) =>
						oldThreads.map(thread => thread.id === threadId ? {
							...thread,
							comments: thread.comments.map(c => c.id === aiTempId ? { ...c, content: fullContent } : c)
						} : thread)
					);
				},
				onCompletion: (finalText) => {
					// AI finished generating the response
					setStreamStatus('completed');
					queryClient.setQueryData<Thread[]>(queryKey, (oldThreads = []) =>
						oldThreads.map(thread => thread.id === threadId ? {
							...thread,
							comments: thread.comments.map(c => c.id === aiTempId ? { ...c, content: finalText } : c)
						} : thread)
					);
				},
				onSave: (finalComment) => {
					// Comment saved to database, replace with real record
					if (finalComment) {
						setStreamStatus('saved');
						queryClient.setQueryData<Thread[]>(queryKey, (oldThreads = []) =>
							oldThreads.map(thread => thread.id === threadId ? {
								...thread,
								comments: thread.comments.map(c => c.id === aiTempId ? finalComment : c)
							} : thread)
						);
					}
					setIsStreaming(false);
					setStreamStatus(null);
					// Invalidate to get the real user comment and AI comment from server
					queryClient.invalidateQueries({ queryKey: ["threads", documentId] });
				},
				onError: (errorMessage) => {
					console.error("AI Error:", errorMessage);
					// Remove both optimistic comments on error
					rollback();
					setError(errorMessage);
					setIsStreaming(false);
					setStreamStatus(null);
				},
			});
		} catch (e) {
			console.error("Failed to generate AI comment:", e);
			// Remove both optimistic comments on error
			rollback();
			setError("Failed to generate AI comment.");
			setIsStreaming(false);
			setStreamStatus(null);
		}
	};

	return { isStreaming, streamStatus, error, generateAIComment };
};
