import React, { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";
import { useAuth } from "../contexts/AuthContext";
import YjsContext from "../hook/yjsProvider";
import Toolbar from "./Toolbar";
import Permissions from "./Permissions";
import "quill/dist/quill.snow.css";

Quill.register("modules/cursors", QuillCursors);

let fonts = Quill.import("attributors/style/font");
fonts.whitelist = ["initial", "sans-serif", "serif", "monospace", "monlam"];
Quill.register(fonts, true);

function Editor({ documentId }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider, yComments } = useContext(YjsContext);
  const [synced, setSynced] = useState(false);
  const [charLength, setLength] = useState(0);

  useEffect(() => {
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: { container: "#toolbar" },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
      },
      placeholder: "Start collaborating...",
    });

    quillRef.current = quill;
    new QuillBinding(yText, quill, yjsProvider?.awareness);
    
    quill.on("text-change", () => {
      setLength(quill.getLength());
    });


    yjsProvider?.on("sync", (isSynced) => {
      setSynced(isSynced);
      setLength(quill.getLength());
    });

    return () => {
      clearYjsProvider();
    };
  }, []);

  

  return (
    <div className="flex ">
    <div>
      <button onClick={toggleConnection} style={{ marginBottom: "10px" }}>
        {online ? "Connected" : "Disconnected"}
      </button>
      <div>{synced ? "Synced" : "Not Synced"}</div>
      <div>Char count: {charLength}</div>
      <Toolbar />
      {!synced && <div>Loading...</div>}
      <div className="relative">
      <div ref={editorRef} style={{ height: "400px", marginTop: "10px", display: !synced ? "none" : "" }} />
    
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