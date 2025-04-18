import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";

import { useEditor } from "@/contexts/EditorContext";
import React, { useState } from "react";
import { Button } from "../ui/button";

function CommentModal({
  documentId,
  setShowCommentModal,
}: {
  readonly documentId: string;
  readonly setShowCommentModal: (show: boolean) => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const currentRange = quill?.getSelection();
  const { currentUser } = useAuth();
  const currentRangeText = quill?.getText(
    currentRange?.index,
    currentRange?.length
  );
  async function addComment() {
    if (!currentRange) return;
    const content = commentText;
    if (!content || content === "") {
      setShowCommentModal(false);
      return;
    }

    const end = currentRange.index + currentRange.length;
    const threadId = crypto.randomUUID();
    try {
      const createdComment = await createComment(
        documentId,
        currentUser.id,
        content,
        currentRange.index,
        end,
        threadId,
        isSuggestion,
        isSuggestion ? suggestedText : undefined,
        currentRangeText
      );
      if (createdComment?.id) {
        // Update the Quill editor to highlight the text
        quill?.formatText(currentRange.index, currentRange.length, "comment", {
          id: createdComment.threadId,
        });

        setShowCommentModal(false);
        setCommentText("");
        setSuggestedText("");

        // You can add code here to update the comments list dynamically if needed
        // setComments((prev) => [createdComment, ...prev]);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
        <textarea
          className="w-full border rounded p-2 mb-4"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Enter your comment..."
          rows={4}
        />

        <div className="flex items-center mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSuggestion}
              onChange={(e) => setIsSuggestion(e.target.checked)}
              className="mr-2"
            />
            Include text suggestion
          </label>
        </div>

        {isSuggestion && (
          <textarea
            className="w-full border rounded p-2 mb-4"
            value={suggestedText}
            onChange={(e) => setSuggestedText(e.target.value)}
            placeholder="Enter suggested replacement text..."
            rows={3}
          />
        )}

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowCommentModal(false);
              setCommentText("");
              setSuggestedText("");
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </Button>
          <Button
            onClick={addComment}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CommentModal;
