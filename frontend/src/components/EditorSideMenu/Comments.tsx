import { deleteComment } from "@/api/comment";
import { useEditor } from "@/contexts/EditorContext";
import { BiTrash } from "react-icons/bi";
import { useParams } from "react-router-dom";
import { useState } from "react";
import Quill from "quill";
import CommentBlot from "../quillExtension/commentBlot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "../ui/scroll-area";
import AvatarWrapper from "../ui/custom-avatar";
import { useTranslation } from "react-i18next";
import { useFetchCommentsByThreadId } from "@/api/queries/documents";
interface Comment {
  id: string;
  threadId: string;
  docId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isSuggestion: boolean;
  suggestedText?: string;
  isSystemGenerated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    picture: string;
    createdAt: string;
  };
}

interface Thread {
  id: string;
  documentId: string;
  isSystemGenerated: boolean;
  initialStartOffset: number;
  initialEndOffset: number;
  selectedText: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    username: string;
    email: string;
    picture?: string;
  };
  comments: Comment[];
}

function Comments() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { getQuill } = useEditor();
  const quill = getQuill(id!);
  const queryClient = useQueryClient();

  // Add a query for fetching thread comments when a thread is selected
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Fetch threads instead of comments
  const { data: threads = [], isLoading, error } = useQuery({
    queryKey: ["threads", id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/threads/document/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch threads");
      return response.json() as Promise<Thread[]>;
    },
    enabled: !!id,
  });

  // Create a query for fetching specific thread comments if needed
  const { data: selectedThreadComments = [] } = useFetchCommentsByThreadId(
    selectedThreadId!
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });

      // Find the thread that contains this comment
      const thread = threads?.find(t => 
        t.comments?.some(c => c.id === id)
      );
      
      // If this was the only comment, remove the highlight
      if (thread && thread.comments?.length === 1) {
        const suggestionSpan = document.querySelector<HTMLSpanElement>(
          `span.comments[data-id="${thread.id}"]`
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
    deleteMutation.mutate(commentId);
  };

  if (isLoading) return <Message text="Loading threads..." />;
  if (error)
    return (
      <Message
        text={`Error loading threads: ${
          error instanceof Error ? error.message : "Unknown error"
        }`}
        error
      />
    );
  if (!threads || threads.length === 0)
    return <Message text={t(`common.noCommentsYet`)} />;

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId === selectedThreadId ? null : threadId);

    const span = quill?.container.querySelector(
      `span[data-id="${threadId}"]`
    ) as HTMLElement;

    if (span) {
      const editor = quill?.root.closest(".ql-editor");
      if (editor) {
        const containerRect = editor.getBoundingClientRect();
        const spanRect = span.getBoundingClientRect();
        const top = spanRect.top - containerRect.top + editor.scrollTop;

        editor.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <ScrollArea className="px-4 h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flow-root -mb-8">
        {threads.map((thread) => {
          const isSelected = selectedThreadId === thread.id;
          const commentsToShow =
            isSelected && selectedThreadComments.length > 0
              ? selectedThreadComments
              : thread.comments || [];

          // Ensure user data exists to prevent errors
          const userName = thread.createdByUser?.username || "Unknown User";
          const userPicture = thread.createdByUser?.picture || "";
          const firstComment = thread.comments?.[0];

          return (
            <div key={thread.id} className=" border-b ">
              {/* Thread header */}
              <div
                className={`cursor-pointer p-2 mb-2 rounded ${
                  isSelected ? "bg-secondary-50" : "hover:bg-gray-50"
                }`}
                onClick={() => handleThreadSelect(thread.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarWrapper
                      imageUrl={userPicture}
                      name={userName}
                      size={24}
                    />
                    <p className="text-sm font-medium">{userName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {thread.createdAt
                      ? new Date(thread.createdAt).toLocaleDateString()
                      : "Unknown date"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {firstComment?.isSuggestion ? "Suggestion" : "Comment"} on: "
                  {thread.selectedText || "Unknown text"}"
                </p>
                <p className="text-xs text-muted-foreground">
                  {thread.comments?.length || 0} {thread.comments?.length === 1 ? 'reply' : 'replies'}
                </p>
              </div>

              {/* Thread comments */}
              {isSelected && commentsToShow && commentsToShow.length > 0 && (
                <div className="pl-4">
                  {commentsToShow.map((comment) =>
                    comment && comment.id ? (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        deleteComment={handleDeleteComment}
                        quill={quill}
                      />
                    ) : null
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function Message({
  text,
  error = false,
}: {
  readonly text: string;
  readonly error?: boolean;
}) {
  return (
    <div
      className={`px-4 py-8 text-center ${
        error ? "text-red-500" : "text-gray-500"
      }`}
    >
      {text}
    </div>
  );
}

interface CommentCardProps {
  readonly comment: Comment;
  readonly deleteComment: (id: string) => void;
  readonly quill: Quill | undefined;
}

function CommentCard({ comment, deleteComment, quill }: CommentCardProps) {
  // Ensure quill is defined before using it
  if (!quill) {
    return null;
  }

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
  return (
    <div className="mb-4 w-full text-left bg-transparent border-0 p-0">
      <div className="rounded-lg transition-shadow cursor-pointer bg-white">
        <div className=" pb-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarWrapper
              imageUrl={comment.user.picture}
              name={comment.user.username}
              size={32}
            />
            <div>
              <p className="text-sm font-medium">{comment.user.username}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <button
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              deleteComment(comment.id);
            }}
            title="Delete comment"
          >
            <BiTrash className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 pt-2">
          {comment.isSuggestion && comment.suggestedText ? (
            <div className="text-sm mb-2">
              <span className="text-muted-foreground">Suggested </span>
              <span className="font-medium bg-yellow-50 px-1 rounded">
                "{comment.suggestedText}"
              </span>
            </div>
          ) : null}
          <p className="text-sm  pl-2 ">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}

export default Comments;
