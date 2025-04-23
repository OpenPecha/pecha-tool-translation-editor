import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "quill/dist/quill.snow.css";
import YjsContext from "../lib/yjsProvider";
import Editor from "./Editor";
import { QuillVersionProvider } from "../contexts/VersionContext";
import "../editor.css";
import CommentBubble from "./Comment/CommentBubble";
import { CommentProvider } from "@/contexts/CommentContext";

const RealTimeEditor = ({
  docId,
  isEditable,
}: {
  docId: string | undefined;
  isEditable: boolean;
}) => {
  const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } =
    useContext(YjsContext);

  useEffect(() => {
    createYjsProvider(docId);
    return () => {
      clearYjsProvider();
    };
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
