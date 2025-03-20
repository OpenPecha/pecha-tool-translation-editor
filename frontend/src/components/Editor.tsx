import React, { useContext, useEffect, useRef, useState, forwardRef } from "react";
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
import OverlayLoading from "./OverlayLoading";
import { createSuggest, fetchSuggests } from "../api/suggest";
import { fetchDocument } from "../api/document";
import { useQuillHistory } from "../contexts/HistoryContext";
quill_import();

const Editor = ({ documentId,isEditable, quillRef }:{documentId:string,isEditable:boolean,quillRef:any}) => {
  const editorRef=useRef(null);
  const toolbarId = "toolbar-container"+"-"+Math.random().toString(36).substring(7);
  const counterId = "counter-container"+"-"+Math.random().toString(36).substring(7);

  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider } = useContext(YjsContext);
  const { currentUser } = useAuth();
  const [synced, setSynced] = useState(false);
  const [comments, setComments] = useState([]); // 🔥 Store comments in Editor
  const [suggestions, setSuggestions] = useState([]); // 🔥 Store comments in Editor
  const [lastContent, setLastContent] = useState("");
  const { registerQuill } = useQuillHistory();
  useEffect(() => {
    const quill = new Quill(editorRef?.current, {
      theme: "snow",
      modules: {
        toolbar: { container: `#${toolbarId}`},
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: { container: `#${counterId}`, unit: "character" },
      
      },
      readOnly: !isEditable,
      placeholder: "Start collaborating...",
      className: "overflow-y-auto h-full"
    });

    quillRef.current = quill;
    registerQuill(quill);
    new QuillBinding(yText, quill, yjsProvider?.awareness);
    yjsProvider?.on("sync", (isSynced) => {
      setSynced(isSynced);
      if(isSynced){
        var plainText = quill.getText();
        if(plainText.trim().length===0){
          console.log('text is empty')
          fetchDocument(documentId).then((doc) => {
            quill.setContents(doc.docs_prosemirror_delta)
          })
          // quill.setText("Start collaborating...");      
        }else{
          console.log('text is not empty')
        }
      }
    });

    // Fetch comments when the editor loads
    loadComments();
    loadSuggestions();
    let currentContentLength = quill.getLength();
    quill.on('text-change', function(delta, oldDelta, source) {
      if (source === 'user') {
        // Check if this operation would delete all content
        
        // If the change would reduce content to just the newline character (empty editor)
        if (quill.getLength() <= 1) {
          // You can add your confirmation logic here
          const shouldDelete = confirm('Are you sure you want to delete all content?');
          
          if (!shouldDelete) {
            // Undo the change by replacing with old content
            quill.setContents(oldDelta);
          }
        }
        // Update our tracking variable
        currentContentLength = quill.getLength();
      }
    });
    return () => {
      clearYjsProvider();
    };
  }, []);

  // 🔥 Fetch comments
  const loadComments = async () => {
    try {
      const data = await fetchComments(documentId);
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };
  const loadSuggestions = async () => {
    try {
      const data = await fetchSuggests(documentId);
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };
  // 🔥 Add a new comment
 
  async function addSuggestion() {
    const range = quillRef.current.getSelection();
    if (!range) return;

    const suggestion = prompt("Enter your suggestion");
    if (!suggestion) return;

    const end = range.index + range.length;
    const id= Math.random().toString(36).substring(7);
    const threadId=id;
    try {
      const createdSuggestion = await createSuggest(threadId,documentId, currentUser.id, suggestion, range.index, end);
      if (createdSuggestion.id) {
        // 🔥 Update the Quill editor to highlight the text
        quillRef.current.formatText(range.index, range.length, "suggest", {
          id: threadId,
        });

        // 🔥 Update the comments list dynamically
        // setComments((prev) => [createdComment, ...prev]); // Add new comment to the top
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }
  return (
    <div className="w-full flex-1 h-full " >
        {/* <Permissions documentId={documentId} /> */}
        <Toolbar id={toolbarId}  addSuggestion={addSuggestion} synced={synced} quill={quillRef.current} />
        {/* <OverlayLoading isLoading={!synced}/> */}
        <div className="relative h-[calc(100vh-130px)] ">
          <div ref={editorRef} style={{  marginTop: "10px",fontFamily:"Monlam",fontSize:18}} />
          <div id={`${counterId}`}>0 characters</div>
        </div>

      {/* 🔥 Pass comments and update function to Comments */}
      {/* <div className="comment-container w-1/4">
        <Comments  comments={comments}  />
      </div> */}
    </div>
  );
};

export default Editor;
