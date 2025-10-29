import { createComment } from "@/api/comment";
import { useAuth } from "@/auth/use-auth-hook";

import { useEditor } from "@/contexts/EditorContext";
import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "../ui/switch";
import AvatarWrapper from "../ui/custom-avatar";
import ContentEditableDiv from "../ui/contentEditable";
import { useTranslation } from "react-i18next";

function CommentInitialize({
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [isSuggestion, setIsSuggestion] = useState(false);
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const currentRangeText = quill?.getText(
    currentRange?.index,
    currentRange?.length
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowCommentModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowCommentModal]);

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
        // Track comment creation

        // Update the Quill editor to highlight the text
        quill?.formatText(
          currentRange!.index,
          currentRange!.length,
          "comment",
          {
            id: createdComment.threadId,
          },
          "user"
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

  const style: StyleProps = {
    right: 0,
    top: currentRange?.top - 80,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    zIndex: 1000,
    maxWidth: "320px",
    minWidth: "280px",
    maxHeight: "250px",
    overflowY: "auto",
  };
  return (
    <div
      ref={modalRef}
      className="absolute bg-[#fff]  border border-[#e5e7eb] flex-col  p-2 rounded-lg "
      style={style}
    >
      <div className="flex items-center mb-4 gap-2">
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={32}
        />
        <div>{currentUser?.name}</div>
      </div>

      <ContentEditableDiv
        ref={commentInputRef}
        className="w-full  border rounded-[18px] scroll-auto px-2 py-1 mb-4 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
        onChange={(e) => {
          setIsDisabled(e.target?.textContent === "");
        }}
        autoFocus
        placeholder="Add a comment..."
      />
      {isSuggestion && (
        <ContentEditableDiv
          ref={suggestionInputRef}
          className="w-full  border rounded-[18px] px-2 py-1 mt-2 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
          placeholder="Add a suggestion..."
        />
      )}
      {!isDisabled && (
        <div className="flex justify-between gap-2">
          <div className="flex items-center my-2 gap-2">
            <Switch
              id="isSuggestionCheckbox"
              checked={isSuggestion}
              onCheckedChange={() => setIsSuggestion(!isSuggestion)}
              style={{ margin: 0 }}
            />
            <Label
              htmlFor="isSuggestionCheckbox"
              style={{ fontSize: "11px", color: "#4b5563" }}
            >
              Suggest
            </Label>
          </div>
          <Button
            disabled={isDisabled || commentMutation.isPending}
            onClick={addComment}
            className="px-4 py-2 rounded-full cursor-pointer bg-secondary-500 text-white hover:bg-secondary-600"
          >
            {commentMutation.isPending ? "Saving..." : "Comment"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default CommentInitialize;
