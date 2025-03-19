import React from "react";
import { FaCommentDots } from "react-icons/fa";

const Toolbar = ({addSuggestion,id, synced}) => {
  return (
    <div id={id} style={{
      border:"none",
      paddingTop: "10px"
    }}>
      <span>{synced ? "🟢" : "🔴"}</span>
      <span className="ql-formats">
        <select className="ql-font">
          <option value="sans-serif" selected>Sans-serif</option>
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
          <FaCommentDots/>
        </button>
      </span>
    </div>
  );
};

export default Toolbar;
