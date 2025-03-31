import Quill from "quill";
import { useEffect, useRef, useState } from "react";
import CommentBlot from "./quillExtension/suggestionBlot";
import { createComment, deleteComment } from "@/api/comment";
import { useAuth } from "@/contexts/AuthContext";
import { useComment } from "@/contexts/CommentContext";

const CommentBubble = () => {
  const bubbleRef = useRef(null);
  const { isModalOpen, position, commentThread, setIsModalOpen } = useComment();
  const [newComment, setNewComment] = useState("");
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const { currentUser } = useAuth();
  // Close bubble when clicked outside

  const handleDelete = (id, onlyComment) => {
    deleteComment(id)
      .then(() => {
        if (onlyComment) {
          const suggestionSpan = document.querySelector(
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

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    if (isSuggestion && !suggestedText.trim()) {
      alert("Please enter suggested text");
      return;
    }

    const comment = commentThread?.[0];
    if (!comment) return;

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

  const style = {
    position: "absolute",
    left: position.left,
    top: position.top,
    background: "#fff",
    border: "1px solid #ccc",
    padding: "8px",
    boxShadow: "0px 2px 10px rgba(0,0,0,0.1)",
    zIndex: 1000,
    borderRadius: "5px",
    maxHeight: "250px",
    maxWidth: "250px",
    minWidth: "200px",
    overflowY: "auto",
  };

  return (
    <div ref={bubbleRef} style={style}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={() => setIsModalOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            fontSize: "16px",
            cursor: "pointer",
            padding: "2px",
            lineHeight: "1",
          }}
        >
          ×
        </button>
      </div>
      {commentThread.map((comment) => (
        <div
          key={comment.id}
          style={{
            padding: "4px 0",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontWeight: 500, fontSize: "13px", color: "#444" }}>
              {comment.user.username}
            </span>
            <span style={{ fontSize: "11px", color: "#666" }}>
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#333", marginBottom: "2px" }}>
            {comment.content}
          </div>
          {comment.suggested_text && (
            <div
              style={{
                fontSize: "12px",
                color: "#3b82f6",
                backgroundColor: "#eff6ff",
                padding: "3px 6px",
                borderRadius: "3px",
                marginBottom: "2px",
              }}
            >
              Suggestion: "{comment.suggested_text}"
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
                color: "#666",
                fontSize: "11px",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {/* Comment input */}
      <div style={{ borderTop: "1px solid #eee", padding: "4px" }}>
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{
            width: "100%",
            height: "32px",
            border: "1px solid #ddd",
            padding: "4px",
            borderRadius: "3px",
            fontSize: "12px",
            resize: "none",
          }}
        />
        <div
          style={{ display: "flex", alignItems: "center", marginTop: "4px" }}
        >
          <input
            type="checkbox"
            id="isSuggestionCheckbox"
            checked={isSuggestion}
            onChange={(e) => setIsSuggestion(e.target.checked)}
            style={{ marginRight: "4px" }}
          />
          <label
            htmlFor="isSuggestionCheckbox"
            style={{ fontSize: "12px", color: "#444" }}
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
                height: "32px",
                border: "1px solid #ddd",
                padding: "4px",
                borderRadius: "3px",
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
            background: "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default CommentBubble;
