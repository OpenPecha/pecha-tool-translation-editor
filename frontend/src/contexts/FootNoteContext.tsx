import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useFetchFootnotesByThreadId } from "@/api/queries/documents";

interface Position {
  top: number;
  left: number;
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

  const { data: footnoteThread = null } = useFetchFootnotesByThreadId(
    threadId!
  );

  const value = useMemo(
    () => ({
      isModalOpen,
      position,
      footnoteThread,
      setIsModalOpen,
    }),
    [isModalOpen, position, footnoteThread]
  );

  //   useEffect(() => {
  //     const openHandler = (data: { position: Position; id: string }) => {
  //       setIsModalOpen(true);
  //       setPosition(data.position);
  //       setThreadId(data.id);
  //     };
  //   }, []);
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
