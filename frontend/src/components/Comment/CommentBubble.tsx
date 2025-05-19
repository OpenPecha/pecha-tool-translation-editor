import { useRef, useState, useEffect } from "react";
import { createComment } from "@/api/comment";
import { useComment } from "@/contexts/CommentContext";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useAuth } from "@/auth/use-auth-hook";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CommentList from "./CommentList";
import ContentEditableDiv from "../ui/contentEditable";

interface User {
  id: string;
  username: string;
  picture?: string;
}

export interface Comment {
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
  right: number;
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

const CommentBubble = ({ documentId }: { documentId: string }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { isModalOpen, position, commentThread, setIsModalOpen } = useComment();
  const [isSuggestion, setIsSuggestion] = useState(false);
  const { currentUser } = useAuth();
  const [isDisabled, setIsDisabled] = useState(true);
  const queryClient = useQueryClient();
  const commentInputRef = useRef<HTMLDivElement>(null);
  const suggestionInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bubbleRef.current &&
        !bubbleRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsModalOpen]);

  const commentMutation = useMutation({
    mutationFn: (commentData: {
      docId: string;
      userId: string;
      content: string;
      startOffset: number;
      endOffset: number;
      threadId: string;
      isSuggestion: boolean;
      suggestedText: string | undefined;
      commentedOn?: string;
    }) =>
      createComment(
        commentData.docId,
        commentData.userId,
        commentData.content,
        commentData.startOffset,
        commentData.endOffset,
        commentData.threadId,
        commentData.isSuggestion,
        commentData.suggestedText,
        commentData.commentedOn
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      setIsSuggestion(false);
      if (commentInputRef.current) {
        commentInputRef.current.textContent = "";
      }
      if (suggestionInputRef.current) {
        suggestionInputRef.current.textContent = "";
      }
      setIsDisabled(true);
      if (bubbleRef.current) {
        bubbleRef.current.scrollTo({
          top: bubbleRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    },
    onError: (error) => {
      console.error("Error submitting comment:", error);
    },
  });

  const addComment = (): void => {
    const comment = commentInputRef.current?.textContent ?? "";
    const suggestion = suggestionInputRef.current?.textContent ?? "";
    if (!comment.trim()) return;
    if (isSuggestion && !suggestion.trim()) {
      alert("Please enter suggested text");
      return;
    }

    const thread = commentThread?.[0];
    const commented_on = thread?.comment_on;
    if (!thread || !currentUser) return;
    commentMutation.mutate({
      docId: thread.docId,
      userId: currentUser.id,
      content: comment,
      startOffset: thread.initial_start_offset,
      endOffset: thread.initial_end_offset,
      threadId: thread.threadId,
      isSuggestion: isSuggestion,
      suggestedText: isSuggestion ? suggestion : undefined,
      commentedOn: commented_on,
    });
  };

  if (!isModalOpen || !commentThread || commentThread.length === 0) return null;

  const style: StyleProps = {
    right: 0,
    top: position.top - 100,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    zIndex: 1000,
    maxWidth: "320px",
    minWidth: "280px",
    maxHeight: "250px",
    overflowY: "auto",
  };
  if (commentThread[0].docId !== documentId) return null;
  return (
    <div
      ref={bubbleRef}
      style={style}
      className="absolute bg-[#fff]  border border-[#e5e7eb] flex-col  p-[2] rounded-lg "
    >
      <div style={{ padding: "0 4px" }}>
        <CommentList />
      </div>

      {/* Comment input */}
      <div className="border-t border-gray-200 p-2 sticky bottom-0 bg-white z-2">
        <ContentEditableDiv
          ref={commentInputRef}
          className="w-full  rounded-[18px] border border-gray-300 focus:outline-none focus:ring-2  px-2 py-1 empty:before:content-[attr(data-placeholder)] cursor-text empty:before:text-gray-400"
          onChange={(e) => {
            setIsDisabled(e.target?.textContent === "");
          }}
          autoFocus
          placeholder="Reply..."
        />
        {isSuggestion && (
          <ContentEditableDiv
            ref={suggestionInputRef}
            className="w-full border cursor-text rounded-[18px] px-2 py-1 mt-2 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400    border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a suggestion..."
          />
        )}

        {!isDisabled && (
          <div className="flex justify-between pt-2">
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
              disabled={commentMutation.isPending}
              onClick={addComment}
              className="px-4 py-2 rounded-full cursor-pointer bg-blue-500 text-white hover:bg-blue-600"
            >
              {commentMutation.isPending ? "Saving..." : "Reply"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentBubble;
