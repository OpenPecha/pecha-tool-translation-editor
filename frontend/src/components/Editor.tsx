import React, { useContext, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCursor } from "@tiptap/extension-collaboration-cursor";
import YjsContext from "../hook/yjsProvider";
import Toolbar from "./Toolbar";
import Permissions from "./Permissions";

function Editor({ documentId }) {
  const { clearYjsProvider, toggleConnection, online, yjsProvider, ydoc } = useContext(YjsContext);
  const [synced, setSynced] = useState(false);
  const [charLength, setCharLength] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc  }),
      CollaborationCursor.configure({ provider: yjsProvider, user: { name: "User", color: "#ff0000" } }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-lg focus:outline-none h-[400px] border p-2",
      },
    },
    onUpdate: ({ editor }) => {
      setCharLength(editor.storage.characterCount.characters());
    },
  });

  useEffect(() => {
    if (!yjsProvider) return;
    yjsProvider.on("sync", (isSynced) => {
      console.log("synced", isSynced);
      setSynced(isSynced);
    });

    return () => clearYjsProvider();
  }, [yjsProvider]);

  return (
    <div className="flex">
      <div>
        <button onClick={toggleConnection} className="mb-2 p-2 border rounded">
          {online ? "Connected" : "Disconnected"}
        </button>
        <div>{synced ? "Synced" : "Not Synced"}</div>
        <div>Char count: {charLength}</div>
        {!synced && <div>Loading...</div>}
        <div className="relative">
          {editor && <EditorContent editor={editor} />}
        </div>
        <Permissions documentId={documentId} />
      </div>
      <div className="comment-container w-1/4">
        <h4>Comments</h4>
      </div>
    </div>
  );
}

export default Editor;
