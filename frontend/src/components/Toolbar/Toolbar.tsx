import { useEffect, useRef, useState } from "react";
import { FaHistory } from "react-icons/fa";
import QuillVersionControls from "./QuillVersionControls";
import { useEditor } from "@/contexts/EditorContext";
import HeaderDropdown from "@/components/quillExtension/HeaderDropdown";
import { EDITOR_READ_ONLY, MAX_HEADING_LEVEL } from "@/utils/editorConfig";
import { BiCommentAdd } from "react-icons/bi";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDocument } from "@/api/document";
import EditableText from "@/components/ui/EditableText";

import { createPortal } from "react-dom";
import VersionDiff from "./VersionDiff";
import Quill from "quill";
import { useAuth } from "@/auth/use-auth-hook";
import FootnoteSvg from "@/assets/toolbar/footnote.svg";
import { FootnoteIcon } from "./ToolbarIcons";

const isEnabled = !EDITOR_READ_ONLY;

interface ToolbarProps {
  addComment: () => void;
  synced: boolean;
  documentId: string;
  toolbarId: string;
  range: any;
  isEditable: boolean;
  documentName?: string; // Add document name prop
}

const Toolbar = ({
  addComment,
  synced,
  documentId,
  toolbarId,
  range,
  isEditable,
  documentName,
}: ToolbarProps) => {
  const { isAuthenticated } = useAuth();

  const versionRef = useRef<HTMLDivElement>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const { getQuill, activeEditor, quillEditors, getElementWithLinenumber } =
    useEditor();

  const [showVersionDiff, setShowVersionDiff] = useState(false);
  const [currentHeader, setCurrentHeader] = useState<string | number>("");
  const quill = getQuill(documentId);

  useEffect(() => {
    const signal = new AbortController();
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside the version dropdown
      if (versionRef.current && versionRef.current.contains(target)) {
        return;
      }
      
      // Check if click is inside any modal dialog (Radix UI dialogs have this attribute)
      const dialogContent = (target as Element)?.closest('[data-slot="dialog-content"]');
      if (dialogContent) {
        return;
      }
      
      // Check if click is inside the diff-portal container
      const diffPortal = document.getElementById("diff-portal");
      if (diffPortal && diffPortal.contains(target)) {
        return;
      }
      
      // If none of the above, close the dropdown
      setOpenHistory(false);
      console.log("clicked outside");
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

    // Find the other quill editor
    const otherQuill = Array.from(quillEditors.values()).find(
      (q) => q !== quill
    );
    const sourceEditor = quill.root;
    const targetEditor = otherQuill?.root;
    // Apply formatting to current quill first
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

    if (!sourceEditor || !targetEditor || !otherQuill) return;
    setTimeout(() => {
      const linenumber = range?.lineNumber;
      if (!linenumber) return;
      const other_element = getElementWithLinenumber(otherQuill, linenumber);
      if (!other_element) return;
      const blot = Quill.find(other_element);
      if (!blot) return;

      const lineIndex = otherQuill.getIndex(blot); // get index of the blot
      if (value === "") {
        for (let i = 1; i <= MAX_HEADING_LEVEL; i++) {
          otherQuill.formatLine(lineIndex, 1, `h${i}`, false, "user");
        }
        otherQuill.formatLine(lineIndex, 1, "h", false, "user");
      } else {
        otherQuill.formatLine(lineIndex, 1, `h${value}`, true, "user");
      }
    }, 100);

    // Get the line number element in the other editor
  };

  const showToolbar = activeEditor === documentId;
  const isEnabledStyle = { display: isEnabled ? "flex" : "none" };

  return (
    <div
      id={toolbarId}
      style={{
        display: showToolbar && isAuthenticated && isEditable ? "flex" : "none", // Add isEditable check
        opacity: showToolbar && isAuthenticated && isEditable ? 1 : 0, // Add isEditable check
        width: "94vw",
        position: "relative",
        margin: "0 auto",
      }}
    >
      <div className="flex items-center flex-1 h-full self-center">
        <span className="ql-formats" style={isEnabledStyle}>
          <button className="ql-undo" title="Undo" />
          <button className="ql-redo" title="Redo" />
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
          <span className="ql-formats" style={isEnabledStyle}>
          <button className="ql-footnote" title="footnote" />
          </span>
        </span>

        {openHistory && (
          <div
            ref={versionRef}
            className="absolute bg-gray-100 z-50 top-10 right-0"
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
            document.getElementById("diff-portal")!
          )}
      </div>
      <div className="flex items-center gap-3 h-full">
        {/* Saving indicator */}
        <div className="flex items-center gap-1">
          {synced ? (
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Document saved"></span>
          ) : (
            <div className="flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-xs text-gray-500 italic">saving...</span>
            </div>
          )}
        </div>
        
        {/* Document name - editable */}
        {documentName && (
          <EditableDocumentName documentId={documentId} documentName={documentName} />
        )}
      </div>
    </div>
  );
};

export const ToolbarButton = ({ 
  children, 
  onClick, 
  title, 
  className 
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className: string;
}) => {
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

// Component for editable document name in toolbar
const EditableDocumentName: React.FC<{
  documentId: string;
  documentName: string;
}> = ({ documentId, documentName }) => {
  const queryClient = useQueryClient();

  // Set up mutation for updating document name
  const updateDocumentMutation = useMutation({
    mutationFn: async (newName: string) => {
      return await updateDocument(documentId, { name: newName });
    },
    onSuccess: () => {
      // Invalidate and refetch document data
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
    onError: (error) => {
      console.error("Failed to update document name:", error);
    },
  });

  const handleSave = async (newName: string) => {
    await updateDocumentMutation.mutateAsync(newName);
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-2xl border">
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <EditableText
        initialText={documentName}
        onSave={handleSave}
        className="text-sm font-medium text-gray-700 max-w-[200px] truncate focus:outline-none"
        placeholder="Document name"
      />
    </div>
  );
};

export default Toolbar;
