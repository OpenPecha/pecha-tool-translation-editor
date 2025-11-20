import { useCommentStore } from "@/stores/commentStore";
import { useAuth } from "@/auth/use-auth-hook";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { MentionsInput, Mention } from "react-mentions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProjectCollaborators } from "@/hooks/useProjectCollaborators";
import "./mentions.css";
import SelectedText from "./SelectedText";
import { TypingAnimation } from "./TypingAnimation";
import { ReferenceRenderer } from "./ReferenceRenderer";
import { useFetchThread } from "./hooks/useFetchThread";
import { useSelectionStore } from "@/stores/selectionStore";
import { useCreateThread } from "./hooks/useCreateThread";
import { useAddComment } from "./hooks/useAddComment";

const MentionsInputComponent = MentionsInput as any;
const MentionComponent = Mention as any;

const ThreadConversation = ({
  documentId,
  projectId,
}: {
  documentId: string;
  projectId?: string;
}) => {
  const queryClient = useQueryClient();
  const {
    getActiveThreadId,
    getSidebarView,
    setActiveThreadId,
    setSidebarView,
  } = useCommentStore();
  const activeThreadId = getActiveThreadId(documentId);
  const sidebarView = getSidebarView(documentId);
  const selection = useSelectionStore((state) => state.selections[documentId]);
  const { data: thread = null } = useFetchThread({ threadId: activeThreadId as string });
  const createThreadMutation = useCreateThread();
  const addCommentMutation = useAddComment();
  const { currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [aiResponseStatus, setAiResponseStatus] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const { data: collaborators } = useProjectCollaborators(projectId || "");
  const users = useMemo(() => {
    const baseUsers = [{ id: "ai", display: "ai" }];
    if (collaborators) {
      const parsedCollaborators = collaborators
        .filter(collaborator => collaborator.id !== currentUser?.id)
        .map(collaborator => ({
          id: collaborator.id,
          display: collaborator.username
        }));
      return [...parsedCollaborators, ...baseUsers];
    }
    return baseUsers;
  }, [collaborators, currentUser?.id]);

  const scrollToBottom = (behavior: "smooth" | "auto" = "auto") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scroll({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom("auto");
    isAtBottomRef.current = true;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          scrollContainerRef.current;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAtBottomRef.current = nearBottom;
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      setTimeout(() => scrollToBottom("smooth"), 100);
    }
  }, [thread?.comments?.length]);

  useEffect(() => {
    if (
      (sidebarView === "thread" || sidebarView === "new") &&
      replyInputRef.current
    ) {
      setTimeout(() => replyInputRef.current?.focus(), 100); // Small timeout to ensure focus after render/animation
    }
  }, [activeThreadId, sidebarView]);

  const onProcessing = (message: string) => {
    setAiResponseStatus(message);
  }
  const onDelta = (delta: string) => {
    queryClient.setQueryData(["thread", activeThreadId], (old: any) => {
      if (!old || !old.comments) return old;
      const newComments = [...old.comments];
      let aiCommentIndex = -1;
      for (let i = newComments.length - 1; i >= 0; i--) {
        if (newComments[i].isSystemGenerated) {
          aiCommentIndex = i;
          break;
        }
      }
      if (aiCommentIndex !== -1) {
        const aiComment = newComments[aiCommentIndex];
        newComments[aiCommentIndex] = {
          ...aiComment,
          content: (aiComment.content || "") + delta,
        };
        return { ...old, comments: newComments };
      }
      return old;
    });
  }

  const onCompletion = (finalText: string) => {
    queryClient.setQueryData(["thread", activeThreadId], (old: any) => {
      if (!old || !old.comments) return old;
      const newComments = [...old.comments];
      let aiCommentIndex = -1;
      for (let i = newComments.length - 1; i >= 0; i--) {
        if (newComments[i].isSystemGenerated) {
          aiCommentIndex = i;
          break;
        }
      }
      if (aiCommentIndex !== -1) {
        const aiComment = newComments[aiCommentIndex];
        newComments[aiCommentIndex] = {
          ...aiComment,
          content: finalText.substring(9), // Remove "@Comment " prefix
        };
        return { ...old, comments: newComments };
      }
      return old;
    });
  }

  const onSave = (comment: any) => {
    queryClient.setQueryData(["thread", activeThreadId], (old: any) => {
      return {
        ...old,
        comments: old?.comments?.map((c: any) => c.user.id === "ai-assistant" ? comment : c)
      };
    });
  }

  const onError = (message: string) => {
    console.error("AI stream error:", message);
    queryClient.setQueryData(["thread", activeThreadId], (old: any) => {
      if (!old || !old.comments) return old;
      const newComments = [...old.comments];
      const aiCommentIndex = newComments.findLastIndex(
        (c) => c.isSystemGenerated && !c.content
      );

      if (aiCommentIndex !== -1) {
        newComments[aiCommentIndex] = {
          ...newComments[aiCommentIndex],
          content: `${message}`,
          hasError: true
        };
        return { ...old, comments: newComments };
      }
      return old;
    });
  }

  const handleSubmitReply = async () => {
    if(!selection) return;
    if (replyContent.trim()) {
      // Clear previous AI errors from the thread
      queryClient.setQueryData(["thread", activeThreadId], (old: any) => {
        if (!old || !old.comments) return old;
        return {
          ...old,
          comments: old.comments.filter((c: any) => !(c.isSystemGenerated && c.hasError))
        };
      });
      if (sidebarView === "thread") {
        addCommentMutation.mutate({
          docId: documentId,
          content: replyContent.trim(),
          threadId: activeThreadId,
          options: {
            selectedText: thread?.selectedText || "",
            onProcessing: onProcessing,
            onDelta: onDelta,
            onCompletion: onCompletion,
            onSave: onSave,
            onError: onError,
          },
        });
        setReplyContent("");
      } else {
        const thread = await createThreadMutation.mutateAsync({
          documentId,
          initialStartOffset: selection?.range.index || 0,
          initialEndOffset:
            (selection?.range.index || 0) + (selection?.range.length || 0),
          selectedText: selection?.text || "",
        });
        if (thread) {
          setActiveThreadId(documentId, thread.id);
          setSidebarView(documentId, "thread");
          addCommentMutation.mutate({
            docId: documentId,
            content: replyContent.trim(),
            threadId: thread.id,
            options: {
              selectedText: thread?.selectedText || "",
              onProcessing: onProcessing,
              onDelta: onDelta,
              onCompletion: onCompletion,
              onSave: onSave,
              onError: onError,
            },
          });
          setReplyContent("");
        } else {
          console.error("Failed to create thread :::", thread);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };
  return (
    <div className="p-2 flex flex-col h-full">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-2 space-y-4"
      >
        {sidebarView === "thread" && thread ? (
          <>
            <SelectedText text={thread.selectedText || ""} />
            {(thread.comments || []).map((comment) => {
              const isCurrentUser =
                comment.user.id === currentUser?.id && !comment.isSystemGenerated;
              const isSystem = comment.isSystemGenerated;
              const hasError = comment.hasError;
              return (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 ${
                    isCurrentUser ? "justify-end" : ""
                  }`}
                >
                  {!isCurrentUser && (
                    <Avatar className="w-5 h-5">
                      {isSystem && <AvatarImage src={comment.user.picture} />}
                      <AvatarFallback className="text-sm">
                        {isSystem
                          ? "AI"
                          : <UserRound size={16} />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`flex flex-col max-w-[calc(100%-44px)] ${
                      isCurrentUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`flex items-baseline space-x-2 ${
                        isCurrentUser ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      <p className="font-semibold text-[10px]">
                        {isCurrentUser
                          ? "You"
                          : isSystem
                          ? "AI Assistant"
                          : comment.user.username}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-lg mt-1 ${
                        isCurrentUser
                          ? "bg-blue-500 text-white"
                          : isSystem 
                          ? hasError ? "bg-red-100" : "bg-gray-100"
                          : "bg-gray-200"
                      }`}
                    >
                      <div className={`text-sm ${hasError ? "text-red-700" : ""}`}>
                        {isSystem && !comment.content ? (
                          <TypingAnimation message={aiResponseStatus} />
                        ) : (
                          <ReferenceRenderer
                            content={comment.content}
                            references={comment.references}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={comment.user.picture} />
                      <AvatarFallback>
                        <UserRound size={16} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <SelectedText
            text={selection?.text || "Starting a new thread..."}
          />
        )}
      </div>

      <form onSubmit={handleSubmitReply} className="mt-4 pt-4 border-t">
        <div className="relative">
          <MentionsInputComponent
            value={replyContent}
            onChange={(e: any) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply..."
            className="mentions"
            inputRef={replyInputRef}
          >
            <MentionComponent
              trigger="@"
              data={users}
              markup="@__display__"
              displayTransform={(_id: any, display: string) => `@${display}`}
              appendSpaceOnAdd
            />
          </MentionsInputComponent>
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent text-blue-500 hover:text-blue-600"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ThreadConversation;
