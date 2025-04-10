import Quill from "quill";
import { useRef, useState } from "react";
import CommentBlot from "../quillExtension/commentBlot";
import { createComment, deleteComment } from "@/api/comment";
import { useComment } from "@/contexts/CommentContext";
import { IoClose } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { BiUser } from "react-icons/bi";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useAuth } from "@/auth/use-auth-hook";

interface User {
  id: string;
  username: string;
}

interface Comment {
  id: string;
  docId: string;
  threadId: string;
  initial_start_offset: number;
  initial_end_offset: number;
  user: User;
  content: string;
  suggested_text?: string;
  createdAt: string;
}

interface StyleProps {
  position: "absolute";
  left: number;
  top: number;
  background: string;
  border: string;
  padding: string;
  boxShadow: string;
  zIndex: number;
  borderRadius: string;
  maxHeight: string;
  maxWidth: string;
  minWidth: string;
  overflowY: "auto";
}

const CommentBubble = () => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { isModalOpen, position, commentThread, setIsModalOpen } = useComment();
  const [newComment, setNewComment] = useState("");
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const { currentUser } = useAuth();

  const handleDelete = (id: string, onlyComment: boolean): void => {
    deleteComment(id)
      .then(() => {
        if (onlyComment) {
          const suggestionSpan = document.querySelector<HTMLSpanElement>(
            `span.comments[data-id="${id}"]`
          );
          console.log(suggestionSpan);
          if (suggestionSpan) {
            const blot = Quill.find(suggestionSpan);
            if (blot && blot instanceof CommentBlot) {
              blot.delete();
            }
          }
        }
        setIsModalOpen(false);
      })
      .catch((error) => console.error("Error deleting comment:", error));
  };

  const handleSubmit = (): void => {
    if (!newComment.trim()) return;
    if (isSuggestion && !suggestedText.trim()) {
      alert("Please enter suggested text");
      return;
    }

    const comment = commentThread?.[0];
    const commented_on = comment?.comment_on;
    if (!comment || !currentUser) return;

    createComment(
      comment.docId,
      currentUser.id,
      newComment.trim(),
      comment.initial_start_offset,
      comment.initial_end_offset,
      comment.threadId,
      isSuggestion,
      isSuggestion ? suggestedText.trim() : undefined,
      commented_on
    )
      .then(() => {
        setIsModalOpen(false);
        setNewComment("");
        setSuggestedText("");
        setIsSuggestion(false);
      })
      .catch((error) => console.error("Error submitting comment:", error));
  };

  if (!isModalOpen || !commentThread || commentThread.length === 0) return null;

  const style: StyleProps = {
    left: position.left,
    top: position.top,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    zIndex: 1000,
    maxWidth: "320px",
    minWidth: "280px",
    maxHeight: "500px",
    overflowY: "auto",
  };

  return (
    <div
      ref={bubbleRef}
      style={style}
      className="absolute bg-[#fff] border border-[#e5e7eb] flex-col  p-[2] rounded-lg "
    >
      <button
        onClick={() => setIsModalOpen(false)}
        className="bg-transparent border-none text-gray-600 cursor-pointer p-2 rounded-full transition-all duration-200 absolute top-0 right-0"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#f3f4f6";
          e.currentTarget.style.color = "#1f2937";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#666";
        }}
      >
        <IoClose size={16} />
      </button>
      <div style={{ maxHeight: "250px", overflowY: "auto", padding: "0 4px" }}>
        {commentThread.map((comment: Comment) => (
          <div
            key={comment.id}
            className="p-2 flex gap-2 border-b border-gray-200"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <BiUser size={14} color="#64748b" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className=" flex items-center gap-3 mb-2">
                <span className="font-semibold text-sm text-gray-800">
                  {comment.user.username}
                </span>
                <span className="text-sm text-nowrap text-[#6b7280]">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-sm text-[#374151] mb-2 word-break-break-word">
                {comment.content}
              </div>

              {comment.suggested_text && (
                <div className="font-semibold text-sm text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded-md mb-2 border border-[#bfdbfe]">
                  <span style={{ fontWeight: 500 }}>Suggestion:</span> "
                  {comment.suggested_text}"
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() =>
                    handleDelete(comment.threadId, commentThread.length === 1)
                  }
                  className="bg-transparent border-none text-gray-600 cursor-pointer p-2 rounded-full transition-all duration-200"
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#fee2e2";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <FaTrash size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="border-t border-gray-200 p-2 sticky bottom-0 bg-white z-2">
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full border border-gray-200 p-2 rounded-md text-sm"
        />
        <div className="flex items-center my-2 gap-2">
          <Switch
            id="isSuggestionCheckbox"
            checked={isSuggestion}
            onCheckedChange={(e) => setIsSuggestion(!isSuggestion)}
            style={{ margin: 0 }}
          />
          <Label
            htmlFor="isSuggestionCheckbox"
            style={{ fontSize: "11px", color: "#4b5563" }}
          >
            Suggest
          </Label>
        </div>
        {isSuggestion && (
          <div style={{ marginTop: "4px" }}>
            <textarea
              placeholder="Suggested text..."
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              className="w-full border border-gray-200 p-2 rounded-md text-sm"
            />
          </div>
        )}
        <Button
          onClick={handleSubmit}
          className="w-full border border-gray-200 p-2 rounded-md text-sm"
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default CommentBubble;
