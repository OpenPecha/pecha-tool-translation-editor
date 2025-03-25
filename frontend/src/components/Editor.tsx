import { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import { useAuth } from "../contexts/AuthContext";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { createComment, fetchComments } from "../api/comment";
import OverlayLoading from "./OverlayLoading";
import { createSuggest, fetchSuggests } from "../api/suggest";
import { fetchDocument } from "../api/document";
import { useQuillHistory } from "../contexts/HistoryContext";
quill_import();

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function (...args: any[]) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const Editor = ({
  documentId,
  isEditable,
  quillRef,
}: {
  documentId: string;
  isEditable: boolean;
  quillRef: any;
}) => {
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).substring(7);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).substring(7);

  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider } =
    useContext(YjsContext);
  const { currentUser } = useAuth();
  const [synced, setSynced] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [comments, setComments] = useState([]); // 🔥 Store comments in Editor
  const [suggestions, setSuggestions] = useState([]); // 🔥 Store comments in Editor
  const [lastContent, setLastContent] = useState("");
  const { registerQuill } = useQuillHistory();

  const updateLineNumbers = (quill: Quill) => {
    if (!lineNumbersRef.current) return;

    const editorElement = editorRef.current?.querySelector(".ql-editor");
    if (!editorElement) return;

    const paragraphs = editorElement.getElementsByTagName("p");
    if (!paragraphs.length) return;

    lineNumbersRef.current.innerHTML = "";

    let lineNumber = 1;
    let groupType: string | null = null;
    let groupTopOffset = 0;
    let groupHeight = 0;
    let isGrouping = false;

    const editorRect = editorElement.getBoundingClientRect();

    const flushGroup = () => {
      if (!isGrouping) return;

      const span = document.createElement("span");
      span.textContent = lineNumber.toString();
      span.classList.add("line-number");
      span.style.top = `${groupTopOffset}px`;
      span.style.height = `${groupHeight}px`;
      span.style.display = "flex";
      span.style.alignItems = "flex-start";
      span.style.justifyContent = "center";
      span.style.paddingTop = "0";
      span.style.lineHeight = "1";

      lineNumbersRef.current!.appendChild(span);
      lineNumber++;

      groupType = null;
      groupTopOffset = 0;
      groupHeight = 0;
      isGrouping = false;
    };

    Array.from(paragraphs).forEach((paragraph, index) => {
      // Skip empty paragraphs
      if (paragraph.textContent?.trim().length === 0) return;

      const currentType = paragraph.getAttribute("data-type");

      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;

      const paraTop = rects[0].top - editorRect.top;
      const paraHeight = rects.reduce((sum, rect) => sum + rect.height, 0);

      if (currentType === groupType && currentType !== null) {
        groupHeight += paraHeight;
      } else {
        flushGroup();

        if (currentType) {
          const editorRect2 = editorElement.getBoundingClientRect();

          range.selectNodeContents(paragraph);
          const rects = Array.from(range.getClientRects());
          const p_top = rects[0].top - editorRect2.top;

          groupType = currentType;
          groupTopOffset = p_top;
          groupHeight = paraHeight;
          isGrouping = true;
        } else {
          const span = document.createElement("span");
          span.textContent = lineNumber.toString();
          span.classList.add("line-number");
          span.style.top = `${paraTop}px`;
          span.style.height = `${paraHeight}px`;
          span.style.lineHeight = `${paraHeight}px`;

          lineNumbersRef.current!.appendChild(span);
          lineNumber++;
        }
      }
    });

    flushGroup();
    lineNumbersRef.current.style.height = `${editorElement.scrollHeight}px`;
  };

  useEffect(() => {
    const quill = new Quill(editorRef?.current, {
      theme: "snow",
      modules: {
        toolbar: { container: `#${toolbarId}` },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: { container: `#${counterId}`, unit: "character" },
      },
      readOnly: !isEditable,
      placeholder: "Start collaborating...",
      className: "overflow-y-auto h-full ",
    });

    quillRef.current = quill;
    registerQuill(quill);
    new QuillBinding(yText, quill, yjsProvider?.awareness);

    const throttledUpdateLineNumbers = throttle(() => {
      requestAnimationFrame(() => updateLineNumbers(quill));
    }, 100);

    updateLineNumbers(quill);

    const editorContainer = editorRef.current?.querySelector(".ql-editor");
    if (editorContainer) {
      editorContainer.addEventListener("scroll", () => {
        if (lineNumbersRef.current) {
          lineNumbersRef.current.style.transform = `translateY(${-editorContainer.scrollTop}px)`;
        }
      });
    }

    yjsProvider?.on("sync", (isSynced) => {
      setSynced(isSynced);
      if (isSynced) {
        setShowOverlay(false);
        var plainText = quill.getText();
        if (plainText.trim().length === 0) {
          console.log("text is empty");
          fetchDocument(documentId).then((doc) => {
            quill.setContents(doc.docs_prosemirror_delta);
          });
        } else {
          console.log("text is not empty");
        }
      }
    });

    // Fetch comments when the editor loads
    loadComments();
    loadSuggestions();
    let currentContentLength = quill.getLength();
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source === "user") {
        if (quill.getLength() <= 1) {
          const shouldDelete = confirm(
            "Are you sure you want to delete all content?"
          );

          if (!shouldDelete) {
            quill.setContents(oldDelta);
          }
        }
        currentContentLength = quill.getLength();
      }
      throttledUpdateLineNumbers();
    });

    const debouncedUpdateLineNumbers = debounce(() => {
      updateLineNumbers(quill);
    }, 1000);
    window.addEventListener("resize", debouncedUpdateLineNumbers);

    return () => {
      clearYjsProvider();
      window.removeEventListener("resize", debouncedUpdateLineNumbers);
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
  const addSection = () => {
    if (quillRef.current) {
      const range = quillRef.current.getSelection(true);
      if (range) {
        const sectionId = uuidv4();
        quillRef.current.format("sect", { id: sectionId });
      }
    }
  };
  // 🔥 Add a new comment

  async function addSuggestion() {
    const range = quillRef.current.getSelection();
    if (!range) return;

    const suggestion = prompt("Enter your suggestion");
    if (!suggestion) return;

    const end = range.index + range.length;
    const id = Math.random().toString(36).substring(7);
    const threadId = id;
    try {
      const createdSuggestion = await createSuggest(
        threadId,
        documentId,
        currentUser.id,
        suggestion,
        range.index,
        end
      );
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
    <div className="w-full flex-1 h-full">
      <Toolbar
        id={toolbarId}
        addSuggestion={addSuggestion}
        synced={synced}
        quill={quillRef.current}
        updateLineNumbers={updateLineNumbers}
        documentId={documentId}
      />
      <div className="relative h-[calc(100vh-130px)]">
        <div className="editor-container w-full h-full flex relative  overflow-hidden">
          <div ref={lineNumbersRef} className="line-numbers mt-[14px]" />
          <div
            ref={editorRef}
            className="editor-content"
            style={{ marginTop: "10px", fontFamily: "Monlam", fontSize: 18 }}
          />
        </div>
        <OverlayLoading isLoading={showOverlay} />
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
