// frontend/src/components/Annotation/AnnotationList.tsx
import { useEffect, useRef } from "react";
import { useAnnotation } from "@/contexts/AnnotationContext";
import { Button } from "../ui/button";
import Quill from "quill";
import { useEditor } from "@/contexts/EditorContext";

interface AnnotationListProps {
  onVote?: (
    quill: Quill,
    option: string, //the chosen thing
    index: number,
    length: number
  ) => void;
}

const AnnotationList = ({ onVote }: AnnotationListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const { isModalOpen, annotation, setIsModalOpen } = useAnnotation();
  const { activeQuill } = useEditor();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen, setIsModalOpen]);

  const handleVote = (option: string) => {
    if (annotation && activeQuill && onVote) {
      onVote(activeQuill, option, annotation.index, annotation.length);
    }
    setIsModalOpen(false);
  };

  if (!isModalOpen || !annotation) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: "fixed",
        top: `${annotation.position.top}px`,
        left: `${annotation.position.left}px`,
        zIndex: 1000,
      }}
      className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]"
    >
      <div className="mb-2 text-xs text-gray-500 italic">
        "{annotation.originalText}"
      </div>
      <div className="mb-3 text-sm font-semibold text-gray-700">
        Replace with:
      </div>
      <div className="flex flex-col gap-2">
        {annotation.options.map((option, index) => (
          <Button
            key={index}
            onClick={() => handleVote(option)}
            variant="outline"
            className="w-full justify-start hover:bg-secondary-50 hover:text-secondary-600 hover:border-secondary-300"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AnnotationList;
