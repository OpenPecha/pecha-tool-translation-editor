import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";
import CommentBubble from "./Comment/CommentBubble";
import { CommentProvider } from "@/contexts/CommentContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";

const RealTimeEditor = ({
  docId,
  isEditable,
}: {
  docId: string | undefined;
  isEditable: boolean;
}) => {
  // const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } =
  //   useContext(YjsContext);
  // useEffect(() => {
  //   if (docId) {
  //     createYjsProvider(docId);
  //   }
  //   return () => {
  //     clearYjsProvider();
  //   };
  // }, []);
  // if (!ydoc || !yjsProvider || !yText || !docId) return null;
  return (
    <QuillVersionProvider docId={docId} maxVersions={50}>
      <CommentProvider>
        <Editor documentId={docId} isEditable={isEditable} />
        <CommentBubble />
      </CommentProvider>
    </QuillVersionProvider>
  );
};

export default RealTimeEditor;
