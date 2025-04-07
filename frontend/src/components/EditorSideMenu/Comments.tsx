import { deleteComment, fetchComments } from "@/api/comment";
import { useEditor } from "@/contexts/EditorContext";
import { useEffect, useState } from "react";
import { BiTrash } from "react-icons/bi";
import { useParams } from "react-router-dom";
import Quill from "quill";
import CommentBlot from "../quillExtension/commentBlot";

function Comments() {
  const { id } = useParams();
  const [comments, setComments] = useState<any[]>([]);
  const { getQuill } = useEditor();
  useEffect(() => {
    if (id) {
      fetchComments(id)
        .then((data) => setComments(data || []))
        .catch((e) => console.error(e));
    }
  }, [id]);

  const handleDeleteComment = (commentId: string) => {
    const quill = getQuill(id!);
    const comment = comments.find((c) => c.id === commentId);

    deleteComment(commentId)
      .then(() => {
        // Filter out the deleted comment
        const updatedComments = comments.filter((c) => c.id !== commentId);
        setComments(updatedComments);

        // Check if this was the last comment in its thread
        const threadComments = updatedComments.filter(
          (c) => c.threadId === comment?.threadId
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
      })
      .catch((e) => console.error(e));
  };
  return (
    <div className="px-4 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {comments.map((comment) => (
            <EachComment
              comment={comment}
              key={comment.id}
              deleteComment={handleDeleteComment}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function EachComment({ comment, deleteComment }) {
  const handleCommentClick = () => {
    const threadId = comment.threadId;
    const span = document.querySelector(`span[data-id="${threadId}"]`);
    if (span) {
      // Scroll the span into view
      span.scrollIntoView({ behavior: "smooth", block: "center" });

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

  return (
    <li key={comment.id} onClick={handleCommentClick}>
      <div className="relative pb-8">
        <div className="relative flex space-x-3">
          <div>
            <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
              <span className="text-sm font-medium text-white">
                {comment.user.username[0].toUpperCase()}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 flex-1 justify-between space-x-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 font-monlam">
                  <span className="font-medium text-gray-900">
                    {comment.user.username}
                  </span>
                  {comment.is_suggestion ? (
                    <span>
                      {" "}
                      suggested "{comment.suggested_text}" for "
                      {comment.comment_on}"
                    </span>
                  ) : (
                    <span> commented on "{comment.comment_on}"</span>
                  )}
                </p>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
                  title="Delete comment"
                >
                  <BiTrash />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
            </div>
            <div className="whitespace-nowrap text-right text-sm text-gray-500">
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </time>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default Comments;
