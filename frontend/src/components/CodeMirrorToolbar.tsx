import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading,
  MessageSquare,
  FileText,
  FileDown,
} from "lucide-react";

interface CodeMirrorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onHeader: (level: number) => void;
  onComment: () => void;
  onFootnote: () => void;
  onExportData: () => void;
  isEditable: boolean;
}

const CodeMirrorToolbar: React.FC<CodeMirrorToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onHeader,
  onComment,
  onFootnote,
  onExportData,
  isEditable,
}) => {
  if (!isEditable) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-white sticky top-0 z-10">
      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <button
          onClick={onBold}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Bold"
          type="button"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={onItalic}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Italic"
          type="button"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={onUnderline}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Underline"
          type="button"
        >
          <Underline className="h-4 w-4" />
        </button>
      </div>

      {/* Headers */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <div className="flex items-center gap-1">
          <Heading className="h-4 w-4 text-gray-600" />
          <select
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level > 0) {
                onHeader(level);
                e.target.value = "0"; // Reset to default
              }
            }}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Select Heading Level"
            defaultValue="0"
          >
            <option value="0">Heading</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
              <option key={level} value={level}>
                H{level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comments & Footnotes */}
      <div className="flex items-center gap-1">
        <button
          onClick={onComment}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Add Comment"
          type="button"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          onClick={onFootnote}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Add Footnote"
          type="button"
        >
          <FileText className="h-4 w-4" />
        </button>
      </div>

      {/* Export Data */}
      <div className="flex items-center gap-1 border-l pl-2 ml-2">
        <button
          onClick={onExportData}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Export Content & Annotations"
          type="button"
        >
          <FileDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CodeMirrorToolbar;
