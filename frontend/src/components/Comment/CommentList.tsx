import { deleteComment } from "@/api/comment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CommentBlot from "../quillExtension/commentBlot";
import Quill from "quill";

import { Comment } from "./CommentBubble";
import AvatarWrapper from "../ui/custom-avatar";
import { formatDate } from "@/lib/formatDate";
import { FaTrash } from "react-icons/fa";

function CommentList({ commentThread, isEditable = true }) {
	const queryClient = useQueryClient();
	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteComment(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["comments"] });

			const onlyComment = commentThread?.length === 1;
			if (onlyComment) {
				const suggestionSpan = document.querySelector<HTMLSpanElement>(
					`span.comments[data-id="${commentThread[0].threadId}"]`,
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
	if (!commentThread || commentThread.length === 0) return null;
	return (
		<>
			{commentThread.map((comment: Comment) => (
				<EachComment
					key={comment.id}
					comment={comment}
					deleteMutation={deleteMutation}
					isEditable={isEditable}
				/>
			))}
		</>
	);
}

function EachComment({
	comment,
	deleteMutation,
	isEditable = true,
}: {
	readonly comment: Comment;
	readonly deleteMutation: any;
	readonly isEditable?: boolean;
}) {
	const handleDelete = (id: string): void => {
		deleteMutation.mutate(id);
	};
	return (
		<div
			className={`p-2 flex gap-2 border-b border-gray-200 flex-col ${
				deleteMutation.isPending && "opacity-15"
			}`}
		>
			<div className="flex items-center gap-2">
				<AvatarWrapper
					imageUrl={comment.user.picture}
					name={comment.user.username}
					size={32}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div className="flex justify-between">
						<div className=" flex flex-col items-start mb-2">
							<span className="font-semibold text-sm text-[#1f1f1f]">
								{comment.user.username}
							</span>
							<span className="text-sm text-nowrap text-[#6b7280]">
								{formatDate(comment.createdAt)}
							</span>
						</div>
						{isEditable && (
							<div style={{ display: "flex", justifyContent: "flex-end" }}>
								<button
									onClick={() => handleDelete(comment.id)}
									className="bg-transparent border-none text-gray-700 cursor-pointer p-2 rounded-full transition-all duration-200"
									onMouseOver={(e) => {
										e.currentTarget.style.backgroundColor = "#fee2e2";
									}}
									onMouseOut={(e) => {
										e.currentTarget.style.backgroundColor = "transparent";
									}}
									disabled={deleteMutation.isPending}
								>
									<FaTrash size={10} />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="w-full">
				<div className="text-sm text-[#374151] cursor-pointer hover:bg-gray-200 px-2 rounded-2xl  mb-2 ">
					{comment.content}
				</div>

			{comment.suggestedText && (
				<div className="font-semibold text-sm text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded-md mb-2 border border-[#bfdbfe]">
					<span style={{ fontWeight: 500 }}>Suggestion:</span> "
					{comment.suggestedText}"
				</div>
			)}
			</div>
		</div>
	);
}

export default CommentList;
