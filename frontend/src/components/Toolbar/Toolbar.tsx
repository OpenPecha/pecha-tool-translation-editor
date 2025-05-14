import React, { useEffect, useRef, useState } from "react";
import { FaHistory } from "react-icons/fa";
import QuillVersionControls from "./QuillVersionControls";
import { useEditor } from "@/contexts/EditorContext";
import HeaderDropdown from "../quillExtension/HeaderDropdown";
import { EDITOR_READ_ONLY, MAX_HEADING_LEVEL } from "@/utils/editorConfig";
import { BiCommentAdd } from "react-icons/bi";
import { Button } from "../ui/button";

import { createPortal } from "react-dom";
import VersionDiff from "./VersionDiff";
const isEnabled = !EDITOR_READ_ONLY;
interface ToolbarProps {
  addComment: () => void;
  synced: boolean;
  documentId: string;
  toolbarId: string;
}

const Toolbar = ({
  addComment,
  synced,
  documentId,
  toolbarId,
}: ToolbarProps) => {
  const versionRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const { getQuill, activeEditor } = useEditor();
  const [showVersionDiff, setShowVersionDiff] = useState(false);
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
        // Check for custom headers using the h1, h2, etc. format that's used in handleHeadingChange
        for (let i = 1; i <= MAX_HEADING_LEVEL; i++) {
          const key_name = `h${i}`;

          if (format[key_name]) {
            setCurrentHeader(i);
            return;
          }
        }
        // fallback to default Quill header if no custom match
        if (format.header) {
          setCurrentHeader(format.header);
        } else if (format.headerN) {
          // Also check for headerN format which is used in some places
          setCurrentHeader(format.headerN);
        } else {
          setCurrentHeader("" as string | number);
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
        quill?.format(`h${i}`, false, "user");
      }
      // Set to paragraph
      quill?.format("h", false, "user");
    } else {
      quill?.format(`h${value}`, true, "user");
    }
  };

  const showToolbar = activeEditor === documentId;
  const isEnabledStyle = { display: isEnabled ? "flex" : "none" };

  return (
    <div
      id={toolbarId}
      style={{
        display: showToolbar ? "flex" : "none",
        opacity: showToolbar ? 1 : 0,
        width: "94vw",
        position: "relative",
        margin: "0 auto",
      }}
    >
      <div className="flex items-center flex-1 h-full">
        <span className="ql-formats" style={isEnabledStyle}>
          <button
            className="ql-undo"
            title="Undo"
            disabled={quill?.history.stack.undo.length === 0}
            onClick={() => quill?.history.undo()}
          />
          <button
            className="ql-redo"
            title="Redo"
            disabled={quill?.history.stack.redo.length === 0}
            onClick={() => quill?.history.redo()}
          />
        </span>
        <span className="ql-formats" style={isEnabledStyle}>
          <select className="ql-font" title="Font" defaultValue="sans-serif">
            <option value="sans-serif">Sans-serif</option>
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
        >
          <option value=""></option>
          <option value="#ffff00">Yellow</option>
          <option value="#ffd700">Gold</option>
          <option value="#90ee90">Light Green</option>
          <option value="#add8e6">Light Blue</option>
        </select>
        <span className="ql-formats" title="Section" style={isEnabledStyle}>
          {/* <ToolbarButton
            onClick={handleSectionCreation}
            title="Section"
            className=""
          >
            <FaObjectGroup />
          </ToolbarButton> */}

          <ToolbarButton
            onClick={() => addComment()}
            title="Suggestion"
            className=""
          >
            <BiCommentAdd size={28} />
          </ToolbarButton>
          <ToolbarButton
            title="Versions"
            className=""
            onClick={() => setOpenHistory(!openHistory)}
          >
            <FaHistory />
          </ToolbarButton>
        </span>

        {openHistory && (
          <div
            ref={versionRef}
            className="absolute bg-gray-100 z-10 top-10 right-0"
          >
            <QuillVersionControls
              openHistory={openHistory}
              setShowVersionDiff={setShowVersionDiff}
            />
          </div>
        )}

        {showVersionDiff &&
          createPortal(
            <div className="fixed inset-0 z-50 overflow-hidden">
              <div className="absolute inset-0 bg-opacity-50" />
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-white rounded-lg shadow-xl  overflow-hidden">
                  <VersionDiff onClose={() => setShowVersionDiff(false)} />
                </div>
              </div>
            </div>,
            document.getElementById("diff-portal")
          )}
      </div>
      <div className="flex items-center gap-2 h-full">
        {/* <PublishButton quill={quill!} /> */}
        <div>
          {synced ? (
            "🟢"
          ) : (
            <span className="text-xs text-gray-400 italic"> saving... </span>
          )}
        </div>
      </div>
    </div>
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
