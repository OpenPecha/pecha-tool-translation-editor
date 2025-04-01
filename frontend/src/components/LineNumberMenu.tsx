import React from "react";
import { useEditor } from "@/contexts/EditorContext";

interface LineNumberMenuProps {
  position: { top: number; left: number };
  lineNumber: number;
  documentId: string;
  onClose: () => void;
}

const LineNumberMenu: React.FC<LineNumberMenuProps> = ({
  position,
  lineNumber,
  documentId,
  onClose,
}) => {
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);

  const handleAddSection = () => {
    onClose();
  };

  return (
    <div
      className="relative bg-white shadow-lg rounded-md py-1  min-w-[160px]"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 222,
      }}
    >
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
        onClick={handleAddSection}
      >
        Toggle Section
      </button>
    </div>
  );
};

export default LineNumberMenu;
