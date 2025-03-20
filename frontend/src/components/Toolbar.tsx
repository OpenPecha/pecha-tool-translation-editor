import React, { useState } from "react";
import { FaCommentDots, FaHistory } from "react-icons/fa";
import { GrDocumentTxt } from "react-icons/gr";
import { useQuillHistory } from "../contexts/HistoryContext";
import QuillHistoryControls from "./QuillHistoryControls";

const Toolbar = ({ addSuggestion, id, synced, quill }) => {
  const [openHistory, setOpenHistory] = useState(false);
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

  return (
    <div
      id={id}
      style={{
        border: "none",
        paddingTop: "10px",
        position: "relative",
      }}
    >
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
      <span className="ql-formats">
        <button className="ql-bold" />
        <button className="ql-italic" />
        <button className="ql-underline" />
        <button className="ql-strike" />
      </span>
      <span className="ql-formats">
        <button onClick={exportText}>
          <GrDocumentTxt />
        </button>
      </span>
      {/* <span className="ql-formats">
        <button className="ql-blockquote" />
        <button className="ql-code-block" />
        <button className="ql-link" /> */}
      {/* <button className="ql-image" /> */}
      {/* <button className="ql-video" /> */}
      {/* <button className="ql-formula" />
      </span> */}
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
      {/* <span className="ql-formats">
        <select className="ql-list">
          <option value="ordered" />
          <option value="bullet" />
          <option value="check" />
        </select>
      </span> */}
      {/* <span className="ql-formats">
        <button className="ql-script" value="sub" />
        <button className="ql-script" value="super" />
      </span> */}
      {/* <span className="ql-formats">
        <select className="ql-indent">
          <option value="-1" />
          <option value="+1" />
        </select>
      </span> */}
      {/* <span className="ql-formats">
        <select className="ql-align" />
      </span>
      <span className="ql-formats">
        <select className="ql-color" />
        <select className="ql-background" />
      </span> */}
      {/* <span className="ql-formats">
        <select className="ql-size">
          <option value="small" />
          <option selected />
          <option value="large" />
          <option value="huge" />
        </select>
      </span> */}
      {/* <span className="ql-formats">
        <button className="ql-clean" />
      </span> */}
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
      {openHistory && (
        <div className="absolute bg-gray-100 z-10 top-10 right-0">
          <QuillHistoryControls />
        </div>
      )}
    </div>
  );
};

export default Toolbar;
