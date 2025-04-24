import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";

import { useEditor } from "@/contexts/EditorContext";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CommentModal({
  documentId,
  setShowCommentModal,
  currentRange,
}: {
  readonly documentId: string;
  readonly setShowCommentModal: (show: boolean) => void;
  readonly currentRange: Range | null;
}) {
  const [isDisabled, setIsDisabled] = useState(true);
  const commentInputRef = useRef<HTMLDivElement | null>(null);
  const suggestionInputRef = useRef<HTMLDivElement | null>(null);
  const [isSuggestion, setIsSuggestion] = useState(false);
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const currentRangeText = quill?.getText(
    currentRange?.index,
    currentRange?.length
  );

  const commentMutation = useMutation({
    mutationFn: (data: {
      comment: string;
      suggestion: string;
      threadId: string;
      start: number;
      end: number;
    }) =>
      createComment(
        documentId,
        currentUser?.id,
        data.comment,
        data.start,
        data.end,
        data.threadId,
        isSuggestion,
        data.suggestion,
        currentRangeText
      ),
    onSuccess: (createdComment) => {
      if (createdComment?.id) {
        // Update the Quill editor to highlight the text
        quill?.formatText(
          currentRange!.index,
          currentRange!.length,
          "comment",
          {
            id: createdComment.threadId,
          }
        );

        setShowCommentModal(false);

        // Invalidate and refetch comments
        queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
      }
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
    },
  });

  function addComment() {
    const comment = commentInputRef.current?.textContent ?? "";
    const suggestion = suggestionInputRef.current?.textContent ?? "";

    if (!currentRange) return;
    if (!comment || comment === "" || !currentUser) {
      setShowCommentModal(false);
      return;
    }
    if (isSuggestion && !suggestion) return;

    const end = currentRange.index + currentRange.length;
    const threadId = crypto.randomUUID();

    commentMutation.mutate({
      comment,
      suggestion,
      threadId,
      start: currentRange.index,
      end,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <div className="flex items-center mb-4 gap-2">
          <Avatar>
            <AvatarFallback></AvatarFallback>
            <AvatarImage src={currentUser?.picture} />
          </Avatar>
          <div>{currentUser?.name}</div>
        </div>
        <div
          contentEditable
          className="w-full min-h-[40px] border rounded p-2 mb-4 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
          ref={commentInputRef}
          onInput={(e) => {
            setIsDisabled(e.target.textContent === "");
          }}
          data-placeholder="Add a comment..."
        />
        <div className="flex items-center mb-4">
          <Checkbox
            checked={isSuggestion}
            onCheckedChange={(checked) => setIsSuggestion(checked as boolean)}
            id="isSuggestion"
            className="mr-2"
          />
          <Label htmlFor="isSuggestion">Include text suggestion</Label>
        </div>

        {isSuggestion && (
          <div
            contentEditable
            className="w-full min-h-[40px] border rounded p-2 mb-4 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
            ref={suggestionInputRef}
            data-placeholder="Add a suggestion..."
          />
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setShowCommentModal(false);
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </Button>
          <Button
            disabled={isDisabled || commentMutation.isPending}
            onClick={addComment}
            className="px-4 py-2 rounded-full cursor-pointer bg-blue-500 text-white hover:bg-blue-600"
          >
            {commentMutation.isPending ? "Saving..." : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CommentModal;
