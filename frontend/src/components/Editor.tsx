import React, { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import { useAuth } from "../contexts/AuthContext";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar";
import Permissions from "./Permissions";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { createComment } from "../api/comment";
import Comments from "./Comments";

quill_import()

function Editor({ documentId }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider, yComments } = useContext(YjsContext);
  const [synced, setSynced] = useState(false);
  const { currentUser,token } = useAuth();
  
  useEffect(() => {
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: { container: "#toolbar" },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: {
          container: '#counter',
          unit: 'character'
        }
      },
      placeholder: "Start collaborating...",
    });

    quillRef.current = quill;
    new QuillBinding(yText, quill, yjsProvider?.awareness);
    
    

    yjsProvider?.on("sync", (isSynced) => {
      setSynced(isSynced);
    });


    document.querySelector(".ql-editor")?.addEventListener("click", function (event) {
      let target = event.target;
      if (target.classList.contains("custom-comment")) {
        alert(`Comment ID: ${target.getAttribute("data-id")}
    Comment: ${target.getAttribute("data-comment")}`);
      }
    });
    return () => {
      clearYjsProvider();
    };
  }, []);

  async function addComment() {
    var range =  quillRef.current.getSelection();
    const comment=prompt("Enter your comment")
    const end=range.index+range.length;
    const created_comment=await createComment(documentId, currentUser.id, comment,range.index, end, token);
    if(created_comment.id){

      if (range) {
        let commentId = created_comment.id; // Unique ID
        quillRef.current.formatText(range.index, range.length, "comment", {
          id: commentId,
          text: comment,
        });
      }
    }
  }
  

  return (
    <div className="flex ">
    <div>
      <button onClick={toggleConnection} style={{ marginBottom: "10px" }}>
        {online ? "Connected" : "Disconnected"}
      </button>
      <div>{synced ? "Synced" : "Not Synced"}</div>
      <button onClick={addComment}>comment</button>
      <Permissions documentId={documentId} />
      <Toolbar />
      {!synced && <div>Loading...</div>}
      <div className="relative">
      <div ref={editorRef} style={{ height: "400px", marginTop: "10px", display: !synced ? "none" : "" }} />
      <div id="counter">0 characters</div>
      </div>
      </div>
      <div className="comment-container w-1/4">
      <Comments documentId={documentId} token={token} />
    </div>
    </div>
  );
}

export default Editor;