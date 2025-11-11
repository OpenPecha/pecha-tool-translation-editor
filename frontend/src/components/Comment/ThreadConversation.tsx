import { useCommentStore } from "@/stores/commentStore";
import { useAuth } from "@/auth/use-auth-hook";
import { useState, useRef, useEffect, useMemo } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { MentionsInput, Mention } from "react-mentions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreateThread, useAddComment } from "@/hooks/useComment";
import { useAIComment } from "@/hooks/useAIComment";
import { useProjectCollaborators } from "@/hooks/useProjectCollaborators";
import "./mentions.css";
import SelectedText from "./SelectedText";

const MentionsInputComponent = MentionsInput as any;
const MentionComponent = Mention as any;

const TypingAnimation = ({ text }: { text: string }) => {
  return (
    <div className="flex items-center gap-1">
      <span>{text}</span>
      <div className="flex gap-0.5">
        <span className="animate-[bounce_1s_ease-in-out_0s_infinite]">.</span>
        <span className="animate-[bounce_1s_ease-in-out_0.2s_infinite]">.</span>
        <span className="animate-[bounce_1s_ease-in-out_0.4s_infinite]">.</span>
      </div>
    </div>
  );
};

const ThreadConversation = ({
  documentId,
  projectId,
}: {
  documentId: string;
  projectId?: string;
}) => {
  const {
    activeThreadId,
    threads,
    sidebarView,
    newCommentRange,
  } = useCommentStore();

  const { currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const { data: collaborators } = useProjectCollaborators(projectId || "", !!projectId);
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

  const activeThread = threads.find((t) => t.id === activeThreadId);

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
  }, [activeThread?.comments.length]);

  useEffect(() => {
    if (
      (sidebarView === "thread" || sidebarView === "new") &&
      replyInputRef.current
    ) {
      setTimeout(() => replyInputRef.current?.focus(), 100); // Small timeout to ensure focus after render/animation
    }
  }, [activeThreadId, sidebarView]);

  const createThreadMutation = useCreateThread(documentId);
  const addCommentMutation = useAddComment(documentId);
  const {
    isStreaming,
    streamStatus,
    error: _aiError,
    generateAIComment
  } = useAIComment(documentId);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || isStreaming) return;

    // extract mentions from replyContent
    const mentions = replyContent.match(/@(\w+)/g) || [];
    const mentionedUserIds = mentions.map((mention) => {
      const username = mention.substring(1); // Remove the @ symbol
      // Find the user ID by username
      const user = users.find(u => u.display === username);
      return user ? user.id : "";
    }).filter(id => id !== ""); // Filter out empty IDs
    const content = replyContent;

    if (sidebarView === "new") {
      setReplyContent("");
      createThreadMutation.mutate(content);
      return;
    }

    if (content.includes("@ai")) {
      const threadId = activeThreadId as string;
      setReplyContent("");
      generateAIComment(content, threadId, activeThread || null);
    } else {
      setReplyContent("");
      if (activeThreadId) {
        addCommentMutation.mutate({
          content,
          threadId: activeThreadId,
          mentionedUserIds
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply(e);
    }
  };

  return (
    <div className="p-2 flex flex-col h-full">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-2 space-y-4"
      >
        {sidebarView === "thread" && activeThread ? (
          <>
            <SelectedText text={activeThread.selectedText || ""} />
            {activeThread.comments.map((comment) => {
              const isCurrentUser =
                comment.user.id === currentUser?.id && !comment.isSystemGenerated;
              const isSystem = comment.isSystemGenerated;
              return (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 ${
                    isCurrentUser ? "justify-end" : ""
                  }`}
                >
                  {!isCurrentUser && (
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={comment.user.picture} />
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
                          : "bg-gray-200"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      {isSystem && comment.id.startsWith('temp-ai-') && streamStatus && (
                        <div className="text-xs opacity-70">
                          {streamStatus === 'thinking' && (
                            <TypingAnimation text="Thinking" />
                          )}
                          {streamStatus === 'streaming' && (
                            <TypingAnimation text="Generating response" />
                          )}
                          {streamStatus === 'completed' && (
                            <TypingAnimation text="Saving" />
                          )}
                        </div>
                      )}
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
            text={newCommentRange?.selectedText || "Starting a new thread..."}
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
            disabled={
              addCommentMutation.isPending ||
              createThreadMutation.isPending ||
              isStreaming
            }
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ThreadConversation;
