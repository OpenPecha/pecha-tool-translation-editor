import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";

const RealTimeEditor = ({
  docId,
  isEditable,
}: {
  docId: string | undefined;
  isEditable: boolean | undefined;
}) => {
  if (isEditable === undefined) return null;
  return (
    <QuillVersionProvider docId={docId} maxVersions={50}>
      <CommentProvider>
        <Editor documentId={docId} isEditable={isEditable} />
      </CommentProvider>
    </QuillVersionProvider>
  );
};

export default RealTimeEditor;
