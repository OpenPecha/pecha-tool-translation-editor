import {
	deleteComment,
	fetchComments,
	fetchCommentsByThreadId,
} from "@/api/comment";
import { useEditor } from "@/contexts/EditorContext";
import { BiTrash } from "react-icons/bi";
import { useParams } from "react-router-dom";
import { useState } from "react";
import Quill from "quill";
import CommentBlot from "../quillExtension/commentBlot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "../ui/scroll-area";
import AvatarWrapper from "../ui/custom-avatar";
import { groupBy } from "lodash";
import { useTranslation } from "react-i18next";
interface Comment {
	id: string;
	threadId: string;
	docId: string;
	userId: string;
	content: string;
	parentCommentId: string | null;
	createdAt: string;
	updatedAt: string;
	comment_on: string;
	initial_start_offset: number;
	initial_end_offset: number;
	is_suggestion: boolean;
	suggested_text?: string;
	user: {
		id: string;
		username: string;
		email: string;
		picture: string;
		createdAt: string;
	};
	childComments: Comment[];
}

function Comments() {
	const { t } = useTranslation();
	const { id } = useParams();
	const { getQuill } = useEditor();
	const quill = getQuill(id!);
	const queryClient = useQueryClient();

	// Add a query for fetching thread comments when a thread is selected
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

	// Create a query for fetching specific thread comments if needed - must be before any conditional returns
	const { data: selectedThreadComments = [] } = useQuery<Comment[]>({
		queryKey: ["comments", selectedThreadId],
		queryFn: async () => {
			// Only fetch if we have a valid threadId
			if (!selectedThreadId) return [];
			try {
				return await fetchCommentsByThreadId(selectedThreadId);
			} catch (error) {
				console.error("Error fetching thread comments:", error);
				return [];
			}
		},
		enabled: !!selectedThreadId,
		staleTime: 30000,
	});

	const {
		data: commentsThread = [],
		isLoading,
		error,
	} = useQuery<Comment[]>({
		queryKey: ["comments", id],
		queryFn: () => fetchComments(id!),
		enabled: !!id,
		staleTime: 30000,
		refetchOnWindowFocus: true,
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteComment(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["comments"] });

			const onlyComment = commentsThread?.length === 1;
			if (onlyComment) {
				const suggestionSpan = document.querySelector<HTMLSpanElement>(
					`span.comments[data-id="${commentsThread[0].threadId}"]`,
				);

				if (suggestionSpan) {
					const blot = Quill.find(suggestionSpan);
					if (blot && blot instanceof CommentBlot) {
						blot.delete();
					}
				}
			}
		},
		onError: (error) => {
			console.error("Error deleting comment:", error);
		},
	});

	const handleDeleteComment = (commentId: string) => {
		deleteMutation.mutate(commentId);
	};

	if (isLoading) return <Message text="Loading comments..." />;
	if (error)
		return (
			<Message
				text={`Error loading comments: ${
					error instanceof Error ? error.message : "Unknown error"
				}`}
				error
			/>
		);
	if (!commentsThread.length) return <Message text={t(`common.noCommentsYet`)} />;

	// Group comments by threadId for better organization
	const groupedThreads = groupBy(
		commentsThread,
		(comment) => comment.threadId || comment.id,
	);

	// Handle thread selection
	const handleThreadSelect = (threadId: string) => {
		setSelectedThreadId(threadId === selectedThreadId ? null : threadId);

		const span = quill?.container.querySelector(
			`span[data-id="${threadId}"]`,
		) as HTMLElement;

		if (span) {
			const editor = quill?.root.closest(".ql-editor");
			if (editor) {
				const containerRect = editor.getBoundingClientRect();
				const spanRect = span.getBoundingClientRect();
				const top = spanRect.top - containerRect.top + editor.scrollTop;

				editor.scrollTo({ top, behavior: "smooth" });
			}
		}
	};

	return (
		<ScrollArea className="px-4 h-[calc(100vh-100px)] overflow-y-auto">
			<div className="flow-root -mb-8">
				{Object.entries(groupedThreads).map(([threadId, threadComments]) => {
					// Make sure we have valid thread comments
					if (!threadComments || threadComments.length === 0) {
						return null; // Skip rendering this thread if no comments
					}

					// Get the first comment to use as the thread header
					const firstComment = threadComments[0];
					const isSelected = selectedThreadId === threadId;
					const commentsToShow =
						isSelected && selectedThreadComments.length > 0
							? selectedThreadComments
							: threadComments;

					// Ensure user data exists to prevent errors
					const userName = firstComment?.user?.username || "Unknown User";
					const userPicture = firstComment?.user?.picture || "";

					return (
						<div key={threadId} className=" border-b ">
							{/* Thread header */}
							<div
								className={`cursor-pointer p-2 mb-2 rounded ${
									isSelected ? "bg-secondary-50" : "hover:bg-gray-50"
								}`}
								onClick={() => handleThreadSelect(threadId)}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<AvatarWrapper
											imageUrl={userPicture}
											name={userName}
											size={24}
										/>
										<p className="text-sm font-medium">{userName}</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{firstComment?.createdAt
											? new Date(firstComment.createdAt).toLocaleDateString()
											: "Unknown date"}
									</p>
								</div>
								<p className="text-xs text-muted-foreground mt-1 truncate">
									{firstComment?.is_suggestion ? "Suggestion" : "Comment"} on: "
									{firstComment?.comment_on || "Unknown text"}"
								</p>
							</div>

							{/* Thread comments */}
							{isSelected && commentsToShow && commentsToShow.length > 0 && (
								<div className="pl-4">
									{commentsToShow.map((comment) =>
										comment && comment.id ? (
											<CommentCard
												key={comment.id}
												comment={comment}
												deleteComment={handleDeleteComment}
												quill={quill}
											/>
										) : null,
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</ScrollArea>
	);
}

function Message({
	text,
	error = false,
}: {
	readonly text: string;
	readonly error?: boolean;
}) {
	return (
		<div
			className={`px-4 py-8 text-center ${
				error ? "text-red-500" : "text-gray-500"
			}`}
		>
			{text}
		</div>
	);
}

interface CommentCardProps {
	readonly comment: Comment;
	readonly deleteComment: (id: string) => void;
	readonly quill: Quill | undefined;
}

function CommentCard({ comment, deleteComment, quill }: CommentCardProps) {
	// Ensure quill is defined before using it
	if (!quill) {
		return null;
	}

	const formattedDate = new Date(comment.createdAt).toLocaleDateString(
		undefined,
		{
			year: "numeric",
			month: "short",
			day: "numeric",
		},
	);
	return (
		<div className="mb-4 w-full text-left bg-transparent border-0 p-0">
			<div className="rounded-lg transition-shadow cursor-pointer bg-white">
				<div className=" pb-0 flex flex-row items-center justify-between">
					<div className="flex items-center gap-2">
						<AvatarWrapper
							imageUrl={comment.user.picture}
							name={comment.user.username}
							size={32}
						/>
						<div>
							<p className="text-sm font-medium">{comment.user.username}</p>
							<p className="text-xs text-muted-foreground">{formattedDate}</p>
						</div>
					</div>
					<button
						className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center"
						onClick={(e) => {
							e.stopPropagation();
							deleteComment(comment.id);
						}}
						title="Delete comment"
					>
						<BiTrash className="h-4 w-4" />
					</button>
				</div>
				<div className="p-3 pt-2">
					{comment.is_suggestion ? (
						<div className="text-sm">
							<span className="text-muted-foreground">Suggested </span>
							<span className="font-medium bg-yellow-50 px-1 rounded">
								"{comment.suggested_text}"
							</span>
							<span className="text-muted-foreground"> for </span>
							<span className="italic">"{comment.comment_on}"</span>
						</div>
					) : null}
					<p className="text-sm  pl-2 ">{comment.content}</p>
				</div>
			</div>
		</div>
	);
}

export default Comments;
