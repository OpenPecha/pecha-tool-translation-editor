import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCommentDots, FaHistory, FaObjectGroup } from "react-icons/fa";
import { GrDocumentTxt } from "react-icons/gr";
import QuillHistoryControls from "./QuillHistoryControls";
import Permissions from "./Permissions";
import { useEditor } from "@/contexts/EditorContext";
import HeaderDropdown from "./quillExtension/HeaderDropdown";
import { MAX_HEADING_LEVEL } from "@/../config";

interface ToolbarProps {
  addSuggestion: () => void;
  id: string;
  synced: boolean;
  documentId: string;
}

const Toolbar = ({ addSuggestion, id, synced, documentId }: ToolbarProps) => {
  const historyRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const { getQuill, activeEditor } = useEditor();
  const [currentHeader, setCurrentHeader] = useState<string | number>("");
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

  useEffect(() => {
    const dropdown = document.querySelector(".ql-headerN");
    const quill = getQuill(documentId); // your custom Quill getter

    if (dropdown && quill) {
      const handleChange = (e: Event) => {
        const value = (e.target as HTMLSelectElement).value;
        if (value === "") {
          quill.format("headerN", false); // Clear format
        } else {
          quill.format("headerN", parseInt(value));
        }
      };

      dropdown.addEventListener("change", handleChange);
      return () => dropdown.removeEventListener("change", handleChange);
    }
    if (!quill) return;

    const handleSelectionChange = (range: any) => {
      if (range) {
        const format = quill.getFormat(range);
        // Check for custom headers
        for (let i = 1; i <= MAX_HEADING_LEVEL + 1; i++) {
          const key_name = `header${i}`;

          if (format[key_name]) {
            setCurrentHeader(i);
            return;
          }
        }
        // fallback to default Quill header if no custom match
        if (format.header) {
          setCurrentHeader(format.header);
        } else {
          setCurrentHeader("");
        }
      }
    };
    quill.on("selection-change", handleSelectionChange);
    return () => {
      quill.off("selection-change", handleSelectionChange);
    };
  }, [documentId]);

  const handleHeadingChange = (value: string | number) => {
    if (value === "") {
      // Apply normal text
      quill.format("header", false);
    } else {
      // Apply custom header
      quill.format(`header${value}`, true);
    }
  };
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
  const showToolbar = activeEditor === documentId;
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
              <HeaderDropdown
                value={currentHeader}
                onChange={handleHeadingChange}
              />
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
