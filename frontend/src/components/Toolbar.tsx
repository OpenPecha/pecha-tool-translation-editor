import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaCommentDots,
  FaHistory,
  FaObjectGroup,
  FaArrowLeft,
} from "react-icons/fa";
import { GrDocumentTxt } from "react-icons/gr";
import QuillHistoryControls from "./QuillHistoryControls";
import Permissions from "./Permissions";
import { useEditor } from "@/contexts/EditorContext";

interface ToolbarProps {
  addSuggestion: () => void;
  id: string;
  synced: boolean;
  documentId: string;
}

const Toolbar = ({ addSuggestion, id, synced, documentId }: ToolbarProps) => {
  const historyRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const exportText = () => {
    if (quill) {
      const text = quill.getText();
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "exported_text.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node)
      ) {
        setOpenHistory(false);
      }
    };

    if (openHistory) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openHistory]);

  const handleSectionCreation = () => {
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        const [startBlot] = quill.getLine(range.index);
        const [endBlot] = quill.getLine(range.index + range.length);

        // Get all lines between start and end
        let currentBlot = startBlot;
        while (currentBlot) {
          if (currentBlot.domNode.tagName === "P") {
            if (currentBlot.domNode.hasAttribute("data-type")) {
              currentBlot.domNode.removeAttribute("data-type");
            } else {
              currentBlot.domNode.setAttribute("data-type", "section");
            }
          }

          if (currentBlot === endBlot) break;
          currentBlot = currentBlot.next;
        }
      }
    }
  };
  const [mouseOverToolbar, setMouseOverToolbar] = useState(false);
  const showToolbar = quill?.hasFocus() || mouseOverToolbar;
  return (
    <>
      {createPortal(
        <div
          id={id}
          style={{
            display: showToolbar ? "flex" : "none",
            opacity: showToolbar ? 1 : 0,
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <span className="ql-formats">
              <select className="ql-font">
                <option value="sans-serif" selected>
                  Sans-serif
                </option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="monlam">Monlam</option> {/* Custom font */}
              </select>
            </span>

            <span className="ql-formats">
              <select className="ql-header">
                <option value="1" />
                <option value="2" />
                <option value="3" />
                <option value="4" />
                <option value="5" />
                <option value="6" />
                <option selected />
              </select>
            </span>
            <span className="ql-formats">
              <select className="ql-size">
                <option value="small" />
                <option selected />
                <option value="large" />
                <option value="huge" />
              </select>
            </span>
            <div className="flex items-center gap-2">
              <span className="ql-formats">
                <button className="ql-bold" />
                <button className="ql-italic" />
                <button className="ql-underline" />
                <button className="ql-strike" />
              </span>
            </div>
            {/* <select className="ql-color"></select> */}
            <select className="ql-background"></select>
            <span className="ql-formats">
              <button className="ql-sect" onClick={handleSectionCreation}>
                <FaObjectGroup />
              </button>
            </span>
            <span className="ql-formats">
              <button className="ql-suggestion" onClick={addSuggestion}>
                <FaCommentDots />
              </button>
            </span>
            <span className="ql-formats">
              <button
                className="ql-history"
                onClick={() => setOpenHistory(!openHistory)}
              >
                <FaHistory />
              </button>
            </span>
            <span className="ql-formats">
              <Permissions documentId={documentId} />
            </span>
            {openHistory && (
              <div
                ref={historyRef}
                className="absolute bg-gray-100 z-10 top-10 right-0"
              >
                <QuillHistoryControls />
              </div>
            )}
            <span className="ql-formats">
              <button onClick={exportText}>
                <GrDocumentTxt />
              </button>
            </span>
          </div>
          <div>
            {synced ? (
              "🟢"
            ) : (
              <span className="text-xs text-gray-400 italic"> saving... </span>
            )}
          </div>
        </div>,
        document.getElementById("toolbar-container")!
      )}
    </>
  );
};

export default Toolbar;
