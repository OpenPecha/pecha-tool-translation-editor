import Quill from "quill";
import { useRef, useState } from "react";
import CommentBlot from "./quillExtension/suggestionBlot";
import { createComment, deleteComment } from "@/api/comment";
import { useAuth } from "@/contexts/AuthContext";
import { useComment } from "@/contexts/CommentContext";
import { IoClose } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { BiUser } from "react-icons/bi";

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
            `span.suggestion[data-id="${id}"]`
          );
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
    if (!comment || !currentUser) return;

    createComment(
      comment.docId,
      currentUser.id,
      newComment.trim(),
      comment.initial_start_offset,
      comment.initial_end_offset,
      comment.threadId,
      isSuggestion,
      isSuggestion ? suggestedText.trim() : undefined
    )
      .then(() => {
        alert("Comment submitted!");
        setIsModalOpen(false);
        setNewComment("");
        setSuggestedText("");
        setIsSuggestion(false);
      })
      .catch((error) => console.error("Error submitting comment:", error));
  };

  if (!isModalOpen || !commentThread || commentThread.length === 0) return null;

  const style: StyleProps = {
    position: "absolute",
    left: position.left,
    top: position.top,
    background: "#fff",
    border: "1px solid #e5e7eb",
    padding: "6px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    zIndex: 1000,
    borderRadius: "8px",
    maxHeight: "400px",
    maxWidth: "320px",
    minWidth: "280px",
    overflowY: "auto",
  };

  return (
    <div ref={bubbleRef} style={style}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "4px",
          position: "sticky",
          top: 0,
          background: "#fff",
          padding: "2px",
          zIndex: 2,
        }}
      >
        <button
          onClick={() => setIsModalOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "2px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
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
      </div>
      <div style={{ maxHeight: "250px", overflowY: "auto", padding: "0 4px" }}>
        {commentThread.map((comment: Comment) => (
          <div
            key={comment.id}
            style={{
              padding: "6px",
              display: "flex",
              gap: "8px",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BiUser size={14} color="#64748b" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "#1f2937",
                  }}
                >
                  {comment.user.username}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#374151",
                  marginBottom: "4px",
                  wordBreak: "break-word",
                }}
              >
                {comment.content}
              </div>

              {comment.suggested_text && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Suggestion:</span> "
                  {comment.suggested_text}"
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() =>
                    handleDelete(comment.id, commentThread.length === 1)
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "background 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#fee2e2";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <FaTrash size={10} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "6px",
          position: "sticky",
          bottom: 0,
          background: "#fff",
          zIndex: 2,
        }}
      >
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{
            width: "100%",
            height: "28px",
            border: "1px solid #e5e7eb",
            padding: "4px",
            borderRadius: "4px",
            fontSize: "12px",
            resize: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "4px",
            gap: "2px",
          }}
        >
          <input
            type="checkbox"
            id="isSuggestionCheckbox"
            checked={isSuggestion}
            onChange={(e) => setIsSuggestion(e.target.checked)}
            style={{ margin: 0 }}
          />
          <label
            htmlFor="isSuggestionCheckbox"
            style={{ fontSize: "11px", color: "#4b5563" }}
          >
            suggest
          </label>
        </div>
        {isSuggestion && (
          <div style={{ marginTop: "4px" }}>
            <textarea
              placeholder="Suggested text..."
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              style={{
                width: "100%",
                height: "28px",
                border: "1px solid #e5e7eb",
                padding: "4px",
                borderRadius: "4px",
                fontSize: "12px",
                resize: "none",
              }}
            />
          </div>
        )}
        <button
          onClick={handleSubmit}
          style={{
            marginTop: "4px",
            width: "100%",
            padding: "4px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            transition: "background 0.2s",
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default CommentBubble;
