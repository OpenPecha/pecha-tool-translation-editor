import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";
import type { Document } from "@/hooks/useCurrentDoc";

const DocumentEditor = ({
  docId,
  isEditable,
  currentDoc,
}: {
  docId: string | undefined;
  isEditable: boolean;
  currentDoc: Document;
}) => {
  const currentVersionData = currentDoc?.currentVersion ? {
    id: currentDoc.currentVersion.id,
    content: currentDoc.currentVersion.content
  } : undefined;

  return (
    <QuillVersionProvider docId={docId} maxVersions={50} currentVersionData={currentVersionData}>
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

export default DocumentEditor;
