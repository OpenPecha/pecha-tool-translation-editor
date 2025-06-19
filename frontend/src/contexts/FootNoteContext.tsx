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
import { fetchFootnotesByThreadId } from "@/api/footnote";

interface Position {
  top: number;
  left: number;
}

interface FootNote {
  id: string;
  docId: string;
  threadId: string;
  initial_start_offset: number;
  initial_end_offset: number;
  user: { id: string; username: string };
  content: string;
  createdAt: string;
  suggested_text?: string;
}

interface FootNoteContextType {
  isModalOpen: boolean;
  position: Position;
  setIsModalOpen: (isOpen: boolean) => void;
}

const FootNoteContext = createContext<FootNoteContextType | null>(null);

interface FootNoteProviderProps {
  children: ReactNode;
}

export const FootNoteProvider = ({ children }: FootNoteProviderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [threadId, setThreadId] = useState<string | null>(null);

  const { data: footnoteThread = null } = useQuery({
    queryKey: ["footnote", threadId],
    queryFn: () => fetchFootnotesByThreadId(threadId!),
    enabled: !!threadId,
  });

  const value = useMemo(
    () => ({
      isModalOpen,
      position,
      footnoteThread,
      setIsModalOpen,
    }),
    [isModalOpen, position, footnoteThread]
  );

  useEffect(() => {
    const openHandler = (data: { position: Position; id: string }) => {
      setIsModalOpen(true);
      setPosition(data.position);
      setThreadId(data.id);
    };
  }, []);
  return (
    <FootNoteContext.Provider value={value}>
      {children}
    </FootNoteContext.Provider>
  );
};

export const useFootNote = (): FootNoteContextType => {
  const context = useContext(FootNoteContext);
  if (!context) {
    throw new Error("useFootNote must be used within a FootNoteProvider");
  }
  return context;
};
