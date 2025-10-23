import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";

import { ClientSideSuspense, useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useEffect, useRef, useState } from "react";
import { CommentProvider } from "@/contexts/CommentContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";
import type { Document } from "@/hooks/useCurrentDoc";
import { AnnotationProvider } from "@/contexts/AnnotationContext";

export const RealtimeDocumentEditor = ({
  docId,
  isEditable,
  currentDoc,
}: {
  docId: string | undefined;
  isEditable: boolean;
  currentDoc: Document;
}) => {
  const room = useRoom();
  const yProvider = getYjsProviderForRoom(room);
  const yDoc = yProvider.getYDoc();
  const yText = yDoc.getText("quill");
  const initializedRef = useRef(false);
  const [isContentReady, setIsContentReady] = useState(false);

  // Initialize Yjs document with database content on first load
  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) return;

    const content = currentDoc?.currentVersion?.content;

    // If yText is empty but we have content in the database, initialize it
    if (yText.length === 0 && content?.ops && content.ops.length > 0) {
      // Wait for the provider to be synced (optional but recommended)
      const initializeContent = () => {
        // Double-check it's still empty (in case another user already added content)
        if (yText.length === 0) {
          // Convert Quill Delta ops to plain text with attributes
          yDoc.transact(() => {
            content.ops.forEach((op: any) => {
              if (typeof op.insert === "string") {
                yText.insert(yText.length, op.insert, op.attributes || {});
              } else if (op.insert && typeof op.insert === "object") {
                // Handle embeds (images, etc.)
                yText.insertEmbed(yText.length, op.insert, op.attributes || {});
              }
            });
          });
        }
        initializedRef.current = true;
        setIsContentReady(true);
      };

      // If provider is connected, initialize immediately
      // Otherwise wait for sync
      if (yProvider.synced) {
        initializeContent();
      } else {
        yProvider.once("synced", initializeContent);
      }
    } else {
      initializedRef.current = true;
      setIsContentReady(true);
    }
  }, [yText, yDoc, currentDoc, yProvider]);

  const currentVersionData = currentDoc?.currentVersion
    ? {
        id: currentDoc.currentVersion.id,
        content: currentDoc.currentVersion.content,
      }
    : undefined;

  return (
    <QuillVersionProvider
      docId={docId}
      maxVersions={50}
      currentVersionData={currentVersionData}
    >
      <CommentProvider>
        <AnnotationProvider>
          <FootNoteProvider>
            <ClientSideSuspense fallback={<div>Loading…</div>}>
              {!isContentReady ? (
                <LoadingScreen />
              ) : (
                <Editor
                  documentId={docId}
                  isEditable={isEditable}
                  currentDoc={currentDoc}
                  yText={yText}
                  provider={yProvider}
                />
              )}
            </ClientSideSuspense>
          </FootNoteProvider>
        </AnnotationProvider>
      </CommentProvider>
    </QuillVersionProvider>
  );
};

export const NormalDocumentEditor = ({
  docId,
  isEditable,
  currentDoc,
}: {
  docId: string | undefined;
  isEditable: boolean;
  currentDoc: Document;
}) => {
  const currentVersionData = currentDoc?.currentVersion
    ? {
        id: currentDoc.currentVersion.id,
        content: currentDoc.currentVersion.content,
      }
    : undefined;

  return (
    <QuillVersionProvider
      docId={docId}
      maxVersions={50}
      currentVersionData={currentVersionData}
    >
      <CommentProvider>
        <AnnotationProvider>
          <FootNoteProvider>
            <ClientSideSuspense fallback={<div>Loading…</div>}>
              <Editor
                documentId={docId}
                isEditable={isEditable}
                currentDoc={currentDoc}
                yText={undefined}
                provider={undefined}
              />
            </ClientSideSuspense>
          </FootNoteProvider>
        </AnnotationProvider>
      </CommentProvider>
    </QuillVersionProvider>
  );
};

const DocumentEditor = ({
  liveEnabled,
  docId,
  isEditable,
  currentDoc,
}: {
  liveEnabled: boolean;
  docId: string;
  isEditable: boolean;
  currentDoc: Document;
}) => {
  if (liveEnabled) {
    return (
      <RealtimeDocumentEditor
        docId={docId}
        isEditable={isEditable}
        currentDoc={currentDoc}
      />
    );
  }
  return (
    <NormalDocumentEditor
      docId={docId}
      isEditable={isEditable}
      currentDoc={currentDoc}
    />
  );
};

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="text-gray-600">Loading document...</p>
      </div>
    </div>
  );
}

export default DocumentEditor;
