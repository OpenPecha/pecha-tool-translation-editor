import Quill from "quill";
import { useRef, useState, useEffect } from "react";
import CommentBlot from "../quillExtension/commentBlot";
import { createComment, deleteComment } from "@/api/comment";
import { useComment } from "@/contexts/CommentContext";
import { IoClose } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useAuth } from "@/auth/use-auth-hook";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { AvatarImage } from "../ui/avatar";
import { formatDate } from "@/lib/formatDate";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });

      const onlyComment = commentThread?.length === 1;
      if (onlyComment) {
        const suggestionSpan = document.querySelector<HTMLSpanElement>(
          `span.comments[data-id="${commentThread[0].threadId}"]`
        );

        if (suggestionSpan) {
          const blot = Quill.find(suggestionSpan);
          if (blot && blot instanceof CommentBlot) {
            blot.delete();
          }
        }
      }
      setIsModalOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting comment:", error);
    },
  });

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
    },
    onError: (error) => {
      console.error("Error submitting comment:", error);
    },
  });

  const handleDelete = (id: string): void => {
    deleteMutation.mutate(id);
  };

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

  return (
    <div
      ref={bubbleRef}
      style={style}
      className="absolute bg-[#fff]  border border-[#e5e7eb] flex-col  p-[2] rounded-lg "
    >
      <div style={{ padding: "0 4px" }}>
        {commentThread.map((comment: Comment) => (
          <div
            key={comment.id}
            className="p-2 flex gap-2 border-b border-gray-200 flex-col"
          >
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={currentUser?.picture} />
                <AvatarFallback
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    borderRadius: "50%",
                    padding: "2px",
                  }}
                >
                  {currentUser?.name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
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
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="bg-transparent border-none text-gray-600 cursor-pointer p-2 rounded-full transition-all duration-200"
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
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="text-sm text-[#374151] cursor-pointer hover:bg-gray-200 px-2 rounded-2xl  mb-2 ">
                {comment.content}
              </div>

              {comment.suggested_text && (
                <div className="font-semibold text-sm text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded-md mb-2 border border-[#bfdbfe]">
                  <span style={{ fontWeight: 500 }}>Suggestion:</span> "
                  {comment.suggested_text}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="border-t border-gray-200 p-2 sticky bottom-0 bg-white z-2">
        <div
          contentEditable
          className="w-full min-h-[40px] rounded-[18px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 p-2 mb-4 empty:before:content-[attr(data-placeholder)] cursor-text empty:before:text-gray-400"
          ref={commentInputRef}
          onInput={(e) => {
            setIsDisabled(e.target.textContent === "");
          }}
          autoFocus
          data-placeholder="Reply..."
        />

        {isSuggestion && (
          <div
            contentEditable
            className="w-full min-h-[40px] border cursor-text rounded-[18px]  p-2 mb-4 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400    border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ref={suggestionInputRef}
            data-placeholder="Add a suggestion..."
          />
        )}

        {!isDisabled && (
          <div className="flex justify-between">
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
