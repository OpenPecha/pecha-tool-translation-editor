import React, { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import { useAuth } from "../contexts/AuthContext";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar";
import Permissions from "./Permissions";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { createComment, fetchComments } from "../api/comment";
import Comments from "./Comments";

quill_import();

function Editor({ documentId }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider } = useContext(YjsContext);
  const { currentUser, token } = useAuth();
  const [synced, setSynced] = useState(false);
  const [comments, setComments] = useState([]); // 🔥 Store comments in Editor

  useEffect(() => {
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: { container: "#toolbar" },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: { container: "#counter", unit: "character" },
      },
      placeholder: "Start collaborating...",
    });

    quillRef.current = quill;
    new QuillBinding(yText, quill, yjsProvider?.awareness);

    yjsProvider?.on("sync", (isSynced) => {
      setSynced(isSynced);
    });

    // Fetch comments when the editor loads
    loadComments();

    return () => {
      clearYjsProvider();
    };
  }, []);

  // 🔥 Fetch comments
  const loadComments = async () => {
    try {
      const data = await fetchComments(documentId, token);
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  // 🔥 Add a new comment
  async function addComment() {
    const range = quillRef.current.getSelection();
    if (!range) return;

    const commentText = prompt("Enter your comment");
    if (!commentText) return;

    const end = range.index + range.length;

    try {
      const createdComment = await createComment(documentId, currentUser.id, commentText, range.index, end, token);
      
      if (createdComment.id) {
        // 🔥 Update the Quill editor to highlight the text
        quillRef.current.formatText(range.index, range.length, "comment", {
          id: createdComment.id,
          text: commentText,
        });

        // 🔥 Update the comments list dynamically
        setComments((prev) => [createdComment, ...prev]); // Add new comment to the top
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  return (
    <div className="flex">
      <div className="editor-container w-3/4">
        <div>{synced ? "Synced" : "Not Synced"}</div>
        <button onClick={addComment}>Comment</button>
        <Permissions documentId={documentId} />
        <Toolbar />
        {!synced && <div>Loading...</div>}
        <div className="relative">
          <div ref={editorRef} style={{ height: "400px", marginTop: "10px", display: !synced ? "none" : "" }} />
          <div id="counter">0 characters</div>
        </div>
      </div>

      {/* 🔥 Pass comments and update function to Comments */}
      <div className="comment-container w-1/4">
        <Comments documentId={documentId} token={token} comments={comments} setComments={setComments} />
      </div>
    </div>
  );
}

export default Editor;
