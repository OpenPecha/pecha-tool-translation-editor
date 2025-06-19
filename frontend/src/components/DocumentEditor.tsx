import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";

const RealTimeEditor = ({
  docId,
  isEditable,
  currentDoc,
}: {
  docId: string | undefined;
  isEditable: boolean;
  currentDoc: any;
}) => {
  return (
    <QuillVersionProvider docId={docId} maxVersions={50}>
      <CommentProvider>
        <FootNoteProvider>
          <Editor
            documentId={docId}
            isEditable={isEditable}
            currentDoc={currentDoc}
          />
        </FootNoteProvider>
      </CommentProvider>
    </QuillVersionProvider>
  );
};

export default RealTimeEditor;
