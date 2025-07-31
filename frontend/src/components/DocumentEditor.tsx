import RichTextCodeMirrorEditor from "./RichTextCodeMirrorEditor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";

interface CurrentDocType {
  id: string;
  content?: string; // Plain text content (may be encoded with annotation markers)
  translations?: Array<{ id: string; language: string; name: string }>;
  annotations?: Array<{
    from: number;
    to: number;
    type: string;
    // Optional database fields
    id?: string;
    content?: Record<string, unknown>;
    createdAt?: string;
  }>;
}

const RealTimeEditor = ({
  docId,
  isEditable,
  currentDoc,
}: {
  docId: string | undefined;
  isEditable: boolean;
  currentDoc: CurrentDocType;
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
      <CommentProvider>
        <FootNoteProvider>
          <RichTextCodeMirrorEditor
            documentId={docId}
            isEditable={isEditable}
            currentDoc={currentDoc}
          />
        </FootNoteProvider>
      </CommentProvider>
    </div>
  );
};

export default RealTimeEditor;
