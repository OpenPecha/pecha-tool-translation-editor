import { useEffect, useRef, useState } from "react";
import type Quill from "quill";
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Link,
  MessageSquare,
} from "lucide-react";

interface BubbleMenuProps {
  quill: Quill | null;
  isEditable: boolean;
  onAddComment?: () => void;
}

const BubbleMenu = ({ quill, isEditable, onAddComment }: BubbleMenuProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quill) return;

    const handleSelectionChange = (range: any) => {
      if (!range || range.length === 0) {
        // No selection, hide bubble menu
        setVisible(false);
        return;
      }

      // Get the bounds of the selection
      const bounds = quill.getBounds(range.index, range.length);
      const editorRect = quill.root.getBoundingClientRect();

      // Calculate position for bubble menu
      const top = editorRect.top + bounds.top + window.scrollY - 50; // Position above selection
      const left =
        editorRect.left +
        bounds.left +
        bounds.width / 2 +
        window.scrollX -
        (bubbleRef.current?.offsetWidth || 0) / 2;

      setPosition({ top, left });
      setVisible(true);
    };

    quill.on("selection-change", handleSelectionChange);

    return () => {
      quill.off("selection-change", handleSelectionChange);
    };
  }, [quill]);

  const handleFormat = (format: string, value?: any) => {
    if (!quill || !isEditable) return;

    const range = quill.getSelection();
    if (!range) return;

    const currentFormat = quill.getFormat(range);

    if (format === "background") {
      // Toggle highlight
      quill.format("background", currentFormat.background ? false : value || "yellow", "user");
    } else if (format === "link") {
      // Simple link - could be enhanced with a link input dialog
      const url = prompt("Enter URL:");
      if (url) {
        quill.format("link", url, "user");
      }
    } else {
      // Toggle other formats
      quill.format(format, !currentFormat[format], "user");
    }

    // Keep focus on editor
    quill.focus();
  };

  const getActiveFormat = (format: string): boolean => {
    if (!quill) return false;
    const range = quill.getSelection();
    if (!range) return false;
    const formats = quill.getFormat(range);
    return !!formats[format];
  };

  if (!visible || !isEditable) return null;

  return (
    <div
      ref={bubbleRef}
      className="bubble-menu"
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
    >
      <div className="bubble-menu-content">
        <button
          type="button"
          className={`bubble-menu-button ${getActiveFormat("bold") ? "active" : ""}`}
          onClick={() => handleFormat("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          className={`bubble-menu-button ${getActiveFormat("italic") ? "active" : ""}`}
          onClick={() => handleFormat("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          className={`bubble-menu-button ${getActiveFormat("underline") ? "active" : ""}`}
          onClick={() => handleFormat("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>

        <div className="bubble-menu-divider" />

        <button
          type="button"
          className={`bubble-menu-button ${getActiveFormat("background") ? "active" : ""}`}
          onClick={() => handleFormat("background", "yellow")}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>

        <button
          type="button"
          className={`bubble-menu-button ${getActiveFormat("link") ? "active" : ""}`}
          onClick={() => handleFormat("link")}
          title="Add Link"
        >
          <Link size={16} />
        </button>

        {onAddComment && (
          <>
            <div className="bubble-menu-divider" />
            <button
              type="button"
              className="bubble-menu-button"
              onClick={onAddComment}
              title="Add Comment"
            >
              <MessageSquare size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BubbleMenu;


