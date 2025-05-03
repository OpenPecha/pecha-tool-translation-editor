import Quill from "quill";
const Block = Quill.import("blots/block");

// Factory function to create custom header blots
function createHeaderBlot(level) {
  class HeaderBlot extends Block {
    static blotName = `h${level}`;
    static tagName = `h${level}`; // This will create <h7>, <h8>, etc.

    static create(value) {
      const node = super.create();
      // We only need to track that this is a header of this level
      // The value will be true when the format is applied
      return node;
    }

    static formats() {
      // Return true to indicate this format is applied
      // This makes it consistent with other formats like bold, italic
      return true;
    }
  }

  return HeaderBlot;
}
export default createHeaderBlot;
