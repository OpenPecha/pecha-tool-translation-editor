import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaHistory, FaObjectGroup } from "react-icons/fa";
import QuillVersionControls from "./QuillVersionControls";
import { useEditor } from "@/contexts/EditorContext";
import HeaderDropdown from "../quillExtension/HeaderDropdown";
import { EDITOR_READ_ONLY, MAX_HEADING_LEVEL } from "@/utils/editorConfig";
import ExportButton from "./ExportButton";
import { BiCommentAdd } from "react-icons/bi";
import { Button } from "../ui/button";

import { PublishButton } from "./Publish";
const isEnabled = !EDITOR_READ_ONLY;
interface ToolbarProps {
  addSuggestion: () => void;
  id: string;
  synced: boolean;
  documentId: string;
}

const Toolbar = ({ addSuggestion, id, synced, documentId }: ToolbarProps) => {
  const versionRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);

  const { getQuill, activeEditor } = useEditor();
  const [currentHeader, setCurrentHeader] = useState<string | number>("");
  const quill = getQuill(documentId);

  useEffect(() => {
    const signal = new AbortController();
    const handleClickOutside = (event: MouseEvent) => {
      if (
        versionRef.current &&
        !versionRef.current.contains(event.target as Node)
      ) {
        setOpenHistory(false);
      }
    };

    if (openHistory) {
      document.addEventListener("mousedown", handleClickOutside, signal);
    } else {
      signal.abort();
    }

    return () => {
      signal.abort();
    };
  }, [openHistory]);

  useEffect(() => {
    const dropdown = document.querySelector(".ql-headerN");

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
  }, [documentId, quill]);

  const handleHeadingChange = (value: string | number) => {
    if (!quill) return;

    if (value === "") {
      // Clear all header formats (h1-h6)
      for (let i = 1; i <= MAX_HEADING_LEVEL; i++) {
        quill.format(`header${i}`, false);
      }
      // Set to paragraph
      quill.format("header", false);
    } else {
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
  const isEnabledStyle = { display: isEnabled ? "flex" : "none" };

  return (
    <>
      {createPortal(
        <div
          id={id}
          style={{
            display: showToolbar ? "flex" : "none",
            opacity: showToolbar ? 1 : 0,
            position: "relative",
          }}
        >
          <div className="flex items-center gap-4 flex-1 h-10">
            <span className="ql-formats" style={isEnabledStyle}>
              <button
                className="ql-undo"
                title="Undo"
                disabled={quill?.history.stack.undo.length === 0}
              />
              <button
                className="ql-redo"
                title="Redo"
                disabled={quill?.history.stack.redo.length === 0}
              />
            </span>
            <span className="ql-formats" style={isEnabledStyle}>
              <select className="ql-font" title="Font">
                <option value="sans-serif" selected>
                  Sans-serif
                </option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="monlam">Monlam</option> {/* Custom font */}
              </select>
            </span>
            <span className="ql-formats" title="Heading" style={isEnabledStyle}>
              <HeaderDropdown
                value={currentHeader}
                onChange={handleHeadingChange}
              />
            </span>
            {/* <span className="ql-formats" title="Size" style={isEnabledStyle}>
              <select className="ql-size">
                <option value="small" />
                <option selected />
                <option value="large" />
                <option value="huge" />
              </select>
            </span> */}
            <div className="flex items-center gap-2" style={isEnabledStyle}>
              <span className="ql-formats">
                <button className="ql-bold" title="Bold" />
                <button className="ql-italic" title="Italic" />
                <button className="ql-underline" title="Underline" />
              </span>
            </div>
            {/* <select className="ql-color"></select> */}
            <select
              className="ql-background"
              style={isEnabledStyle}
              title="Highlight"
            ></select>
            <span className="ql-formats" title="Section" style={isEnabledStyle}>
              <ToolbarButton
                onClick={handleSectionCreation}
                title="Section"
                className=""
              >
                <FaObjectGroup />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => addSuggestion()}
                title="Suggestion"
                className=""
              >
                <BiCommentAdd size={28} />
              </ToolbarButton>
              <ToolbarButton
                title="Versions"
                className="ql-history"
                onClick={() => setOpenHistory(!openHistory)}
              >
                <FaHistory />
              </ToolbarButton>
            </span>

            <div
              ref={versionRef}
              style={{
                display: openHistory ? "block" : "none",
              }}
              className="absolute bg-gray-100 z-10 top-10 right-0"
            >
              <QuillVersionControls />
            </div>
            <span className="ql-formats" title="Export">
              <ExportButton doc_id={documentId} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PublishButton quill={quill!} />
            <div>
              {synced ? (
                "🟢"
              ) : (
                <span className="text-xs text-gray-400 italic">
                  {" "}
                  saving...{" "}
                </span>
              )}
            </div>
          </div>
        </div>,
        document.getElementById("toolbar-container")!
      )}
    </>
  );
};

export const ToolbarButton = ({ children, onClick, title, className }) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      title={title}
      className={
        className +
        " w-full text-left py-2 px-4  rounded-lg cursor-pointer font-medium text-gray-700 transition-colors flex items-center justify-between"
      }
    >
      {children}
    </Button>
  );
};

export default Toolbar;
