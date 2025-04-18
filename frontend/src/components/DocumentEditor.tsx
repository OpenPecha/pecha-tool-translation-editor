import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "quill/dist/quill.snow.css";
import YjsContext from "../lib/yjsProvider";
import Editor from "./Editor";
import { fetchDocument } from "../api/document";
import { QuillVersionProvider } from "../contexts/VersionContext";
import "../editor.css";
import CommentBubble from "./Comment/CommentBubble";
import { CommentProvider } from "@/contexts/CommentContext";
import { useAuth } from "@/auth/use-auth-hook";

import { EDITOR_ENTER_ONLY, EDITOR_READ_ONLY } from "@/utils/editorConfig";
import disableDevtool from "disable-devtool";

const RealTimeEditor = ({ docId }: { docId: string | undefined }) => {
  const { id } = useParams();
  const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } =
    useContext(YjsContext);
  const { currentUser } = useAuth();
  const [isEditable, setIsEditable] = useState(false);
  const roomId = docId ?? id;
  useEffect(() => {
    fetchDocument(roomId).then((doc) => {
      if (doc?.permissions && !EDITOR_READ_ONLY) {
        doc?.permissions.find((permission) => {
          if (permission?.userId === currentUser.id && permission?.canWrite) {
            setIsEditable(true);
          }
        });
      } else {
        disableDevtool({
          url: "/",
          disableMenu: true,
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
    <QuillVersionProvider docId={roomId} maxVersions={50}>
      <CommentProvider>
        <Editor documentId={roomId} isEditable={isEditable} />
        <CommentBubble />
      </CommentProvider>
    </QuillVersionProvider>
  );
};

export default RealTimeEditor;
