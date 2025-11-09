import { fetchCommentsByThreadId } from "@/api/comment";
import emitter from "@/services/eventBus";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";

interface Position {
  top: number;
  left: number;
}

export interface Comment {
  id: string;
  docId: string;
  threadId: string;
  userId: string;
  user: { 
    id: string; 
    username: string; 
    email: string;
    picture?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
  isSuggestion: boolean;
  suggestedText?: string;
  isSystemGenerated: boolean;
}

interface CommentContextType {
  isModalOpen: boolean;
  position: Position;
  commentThread: Comment[] | null;
  setIsModalOpen: (isOpen: boolean) => void;
}

const CommentContext = createContext<CommentContextType | null>(null);

interface CommentProviderProps {
  children: ReactNode;
}

export const CommentProvider = ({ children }: CommentProviderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [threadId, setThreadId] = useState<string | null>(null);

  const { data: commentThread = null } = useQuery({
    queryKey: ["comments", threadId],
    queryFn: () => fetchCommentsByThreadId(threadId!),
    enabled: !!threadId,
  });

  const value = useMemo(
    () => ({
      isModalOpen,
      position,
      commentThread,
      setIsModalOpen,
    }),
    [isModalOpen, position, commentThread]
  );

  useEffect(() => {
    const openHandler = (data: { position: Position; id: string }) => {
      setIsModalOpen(true);
      setPosition(data.position);
      setThreadId(data.id);
    };

    emitter?.on("showCommentBubble", openHandler);

    return () => {
      emitter?.off("showCommentBubble", openHandler);
    };
  }, []);

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
};

export const useComment = (): CommentContextType => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error("useComment must be used within a CommentProvider");
  }
  return context;
};
