import RichTextCodeMirrorEditor from "./RichTextCodeMirrorEditor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";

interface CurrentDocType {
  id: string;
  content?: string; // Plain text content
  docs_prosemirror_delta?: { ops: Array<{ insert: string }> };
  translations?: Array<{ id: string; language: string; name: string }>;
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
