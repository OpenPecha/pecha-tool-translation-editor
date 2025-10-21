// frontend/src/contexts/AnnotationContext.tsx
import emitter from "@/services/eventBus";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";

interface Position {
  top: number;
  left: number;
}

interface Annotation {
  id: string;
  options: string[];
  position: Position;
  index: number; // ADD THIS
  length: number; // ADD THIS
  originalText: string; // ADD THIS (optional, for reference)
}

interface AnnotationContextType {
  isModalOpen: boolean;
  annotation: Annotation | null;
  setIsModalOpen: (isOpen: boolean) => void;
  setAnnotation: (annotation: Annotation | null) => void;
}

const AnnotationContext = createContext<AnnotationContextType | null>(null);

interface AnnotationProviderProps {
  children: ReactNode;
}

export const AnnotationProvider = ({ children }: AnnotationProviderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [annotation, setAnnotation] = useState<Annotation | null>(null);

  const value = useMemo(
    () => ({
      isModalOpen,
      annotation,
      setIsModalOpen,
      setAnnotation,
    }),
    [isModalOpen, annotation]
  );

  useEffect(() => {
    const openHandler = (data: {
      id: string;
      options: string[];
      position: Position;
      index: number; // ADD THIS
      length: number; // ADD THIS
      originalText: string; // ADD THIS
    }) => {
      setAnnotation({
        id: data.id,
        options: data.options,
        position: data.position,
        index: data.index, // ADD THIS
        length: data.length, // ADD THIS
        originalText: data.originalText, // ADD THIS
      });
      setIsModalOpen(true);
    };

    emitter?.on("showAnnotationPopup", openHandler);

    return () => {
      emitter?.off("showAnnotationPopup", openHandler);
    };
  }, []);

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
};

export const useAnnotation = (): AnnotationContextType => {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error("useAnnotation must be used within an AnnotationProvider");
  }
  return context;
};
