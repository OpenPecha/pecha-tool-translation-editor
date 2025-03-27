import React, { useEffect, useRef, useState } from "react";
import {
  FaCommentDots,
  FaHistory,
  FaObjectGroup,
  FaBars,
  FaHamburger,
  FaAlignJustify,
  FaSkullCrossbones,
  FaArrowLeft,
} from "react-icons/fa";
import { GrDocumentTxt } from "react-icons/gr";
import { useQuillHistory } from "../contexts/HistoryContext";
import QuillHistoryControls from "./QuillHistoryControls";
import Permissions from "./Permissions";
import { createPortal } from "react-dom";

interface ToolbarProps {
  addSuggestion: () => void;
  id: string;
  synced: boolean;
  quill: any;
  documentId: string;
}

const Toolbar = ({
  addSuggestion,
  id,
  synced,
  quill,
  documentId,
}: ToolbarProps) => {
  const historyRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);

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

  return (
    <div className="absolute top-0 right-0 w-full flex items-center ">
      <button
        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
        className="p-2 hover:bg-gray-100 rounded-md z-10 absolute right-2 bg-gray-100 border border-gray-200 top-1.5"
        aria-label="Toggle toolbar"
      >
        <FaAlignJustify />
      </button>
      <div
        id={id}
        style={{
          border: "none",
          position: "absolute",
          display: "flex",
          gap: "10px",
          height: "auto",
          transform: isToolbarOpen ? "translateX(0)" : "translateX(-100%)",
          opacity: isToolbarOpen ? 1 : 0,
          transition: "all 0.3s ease",
          visibility: isToolbarOpen ? "visible" : "hidden",
          backgroundColor: "white",
          borderRadius: "0.375rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          alignItems: "center",
          zIndex: 200,
          width: "100%",
          paddingLeft: "40px",
          paddingBottom: "10px",
          paddingRight: "10px",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          <span>{synced ? "🟢" : "🔴"}</span>
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

          {/* <span className="ql-formats">
          <select className="ql-header">
            <option value="1" />
            <option value="2" />
            <option value="3" />
            <option value="4" />
            <option value="5" />
            <option value="6" />
            <option selected />
          </select>
        </span> */}
          <span className="ql-formats">
            <select className="ql-size">
              <option value="small" />
              <option selected />
              <option value="large" />
              <option value="huge" />
            </select>
          </span>
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
        <button
          onClick={() => setIsToolbarOpen(false)}
          className="p-2 hover:bg-gray-100 rounded-md"
          aria-label="Close toolbar"
        >
          <FaArrowLeft />
        </button>
        {/* <div className="flex items-center gap-2">
          <span className="ql-formats">
            <button className="ql-bold" />
            <button className="ql-italic" />
            <button className="ql-underline" />
            <button className="ql-strike" />
          </span>
        </div> */}
      </div>
    </div>
  );
};

export default Toolbar;
