import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "quill/dist/quill.snow.css";
import YjsContext from "../lib/yjsProvider";
import Editor from "./Editor";
import { fetchDocument } from "../api/document";
import { useAuth } from "../contexts/AuthContext";
import { QuillHistoryProvider } from "../contexts/HistoryContext";
import "../editor.css";
import CommentBubble from "./CommentBubble";
import { CommentProvider } from "@/contexts/CommentContext";
const RealTimeEditor = ({ docId }: { docId: string | undefined }) => {
  const { id } = useParams();
  const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } =
    useContext(YjsContext);
  const { currentUser } = useAuth();
  const [isEditable, setIsEditable] = useState(false);
  const roomId = docId ?? id;
  useEffect(() => {
    fetchDocument(roomId).then((doc) => {
      if (doc?.permissions) {
        doc?.permissions.find((permission) => {
          if (permission.userId === currentUser.id) {
            setIsEditable(true);
          }
        });
      }
      createYjsProvider(roomId);
    });
    return () => {
      clearYjsProvider();
    };
    // const yUndoManager = new Y.UndoManager(yText);
  }, []);

  if (!ydoc || !yjsProvider || !yText || !roomId) return null;
  return (
    <QuillHistoryProvider docId={roomId} maxVersions={50}>
      <CommentProvider>
        <Editor documentId={roomId} isEditable={isEditable} />
        <CommentBubble />
      </CommentProvider>
    </QuillHistoryProvider>
  );
};

export default RealTimeEditor;
