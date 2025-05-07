import { deleteComment, fetchComments } from "@/api/comment";
import { useEditor } from "@/contexts/EditorContext";
import { BiTrash } from "react-icons/bi";
import { useParams } from "react-router-dom";
import Quill from "quill";
import CommentBlot from "../quillExtension/commentBlot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Comment } from "../Comment/CommentBubble";

function Comments() {
  const { id } = useParams();
  const { getQuill } = useEditor();
  const queryClient = useQueryClient();
  const quill = getQuill(id!);
  // Fetch comments using React Query
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => fetchComments(id!),
    enabled: !!id, // Only run query if id exists
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: (_, commentId) => {
      // Invalidate and refetch comments after deletion
      queryClient.invalidateQueries({ queryKey: ["comments", id] });

      // Handle UI updates that need to happen immediately
      const comment = comments.find((c: Comment) => c.id === commentId);

      // Check if this was the last comment in its thread
      const threadComments = comments.filter(
        (c: Comment) => c.threadId === comment?.threadId && c.id !== commentId
      );

      if (threadComments.length === 0 && quill && comment?.threadId) {
        // Find and remove the suggestion mark from the editor
        const suggestionSpan = document.querySelector<HTMLSpanElement>(
          `span.comments[data-id="${comment.threadId}"]`
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
    deleteCommentMutation.mutate(commentId);
  };
  if (isLoading) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        Loading comments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center text-red-500">
        Error loading comments:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">No comments yet</div>
    );
  }

  return (
    <ScrollArea className="px-4 h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flow-root">
        <div className="-mb-8">
          {comments.map((comment: Comment) => (
            <EachComment
              comment={comment}
              key={comment.id}
              deleteComment={handleDeleteComment}
              quill={quill}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

interface EachCommentProps {
  readonly comment: Comment;
  readonly deleteComment: (commentId: string) => void;
  readonly quill: Quill;
}

function EachComment({ comment, deleteComment, quill }: EachCommentProps) {
  const handleCommentClick = () => {
    const threadId = comment.threadId;
    const span = quill.container.querySelector(
      `span[data-id="${threadId}"]`
    ) as HTMLElement;
    if (span) {
      // Scroll the span into view
      // span.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight with yellow background temporarily
      const originalBg = span.style.backgroundColor;
      span.style.backgroundColor = "yellow";
      span.style.transition = "background-color 0.5s ease";

      // Reset background after 1 second
      setTimeout(() => {
        span.style.backgroundColor = originalBg;
      }, 1000);
    }
  };

  // Prevent event propagation when clicking delete button
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteComment(comment.id);
  };

  // Format the date nicely
  const formattedDate = new Date(comment.createdAt).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
  return (
    <div
      className="mb-4 w-full text-left bg-transparent border-0 p-0"
      onClick={handleCommentClick}
    >
      <div className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white">
        <div className="p-3 pb-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage
                src={comment.user.picture}
                alt={comment.user.username}
              />
              <AvatarFallback
                style={{ backgroundColor: "#f59e0b", color: "#fff" }}
              >
                {comment.user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{comment.user.username}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <button
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center"
            onClick={handleDeleteClick}
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
          ) : (
            <div className="text-sm">
              <span className="text-muted-foreground">Commented on </span>
              <span className="italic">"{comment.comment_on}"</span>
            </div>
          )}
          <p className="mt-2 text-sm border-l-2 border-blue-200 pl-2 py-1">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Comments;
