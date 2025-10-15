import "quill/dist/quill.snow.css";
import Editor from "./Editor";
import "../editor.css";
import { CommentProvider } from "@/contexts/CommentContext";
import { QuillVersionProvider } from "@/contexts/VersionContext";
import { FootNoteProvider } from "@/contexts/FootNoteContext";
import type { Document } from "@/hooks/useCurrentDoc";


import {
  ClientSideSuspense,
  useRoom
} from "@liveblocks/react/suspense";

import { getYjsProviderForRoom } from "@liveblocks/yjs";

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

  const currentVersionData = currentDoc?.currentVersion ? {
    id: currentDoc.currentVersion.id,
    content: currentDoc.currentVersion.content
  } : undefined;

  return (
    <QuillVersionProvider docId={docId} maxVersions={50} currentVersionData={currentVersionData}>
      <CommentProvider>
        <FootNoteProvider>
      <ClientSideSuspense fallback={<div>Loading…</div>}>
      <Editor
            documentId={docId}
            isEditable={isEditable}
            currentDoc={currentDoc}
            yText={yText}
            provider={yProvider}
          /> 
        </ClientSideSuspense>
        </FootNoteProvider>
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

  const currentVersionData = currentDoc?.currentVersion ? {
    id: currentDoc.currentVersion.id,
    content: currentDoc.currentVersion.content
  } : undefined;

  return (
    <QuillVersionProvider docId={docId} maxVersions={50} currentVersionData={currentVersionData}>
      <CommentProvider>
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
      </CommentProvider>
    </QuillVersionProvider>
  );
};

const DocumentEditor = ({liveEnabled,docId,isEditable,currentDoc}:{liveEnabled:boolean,docId:string,isEditable:boolean,currentDoc:Document})=>{
  if(liveEnabled){
    return <RealtimeDocumentEditor docId={docId} isEditable={isEditable} currentDoc={currentDoc} />
  }
  return <NormalDocumentEditor docId={docId} isEditable={isEditable} currentDoc={currentDoc} />

}


export default DocumentEditor;
